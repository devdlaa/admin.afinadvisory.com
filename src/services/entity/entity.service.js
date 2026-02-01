import { PrismaClient } from "@prisma/client";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../../utils/server/errors.js";

const prisma = new PrismaClient();

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const validatePAN = (pan) => {
  if (!PAN_REGEX.test(pan)) {
    throw new ValidationError(
      "Invalid PAN format. Expected format: ABCDE1234F (5 letters + 4 digits + 1 letter)",
    );
  }
};

const validateCustomFields = (fields) => {
  if (fields === undefined) return [];

  if (!Array.isArray(fields)) {
    throw new ValidationError("custom_fields must be an array");
  }

  if (fields.length > 10) {
    throw new ValidationError("Maximum 10 custom fields allowed");
  }

  const seen = new Set();

  return fields.map((field) => {
    if (!field || typeof field !== "object") {
      throw new ValidationError("Invalid custom field object");
    }

    const name = field.name?.trim();
    if (!name) {
      throw new ValidationError("Custom field name is required");
    }

    if (name.length > 50) {
      throw new ValidationError("Custom field name too long (max 50)");
    }

    if (!/^[a-zA-Z0-9 _-]+$/.test(name)) {
      throw new ValidationError(`Invalid characters in field name: ${name}`);
    }

    const key = name.toLowerCase();
    if (seen.has(key)) {
      throw new ValidationError(`Duplicate custom field name: ${name}`);
    }
    seen.add(key);

    let value = null;

    if (field.value !== undefined && field.value !== null) {
      if (typeof field.value !== "string") {
        throw new ValidationError(`Value for '${name}' must be a string`);
      }

      const trimmed = field.value.trim();

      if (trimmed.length > 255) {
        throw new ValidationError(`Value for '${name}' is too long (max 255)`);
      }

      value = trimmed;
    }

    return { name, value };
  });
};

const createEntity = async (data, created_by) => {
  return prisma.$transaction(async (tx) => {
    // normalize optional PAN
    const pan = data.pan ? data.pan.toUpperCase() : null;

    // conditional PAN validation
    if (data.entity_type !== "UN_REGISTRED") {
      if (!pan) {
        throw new ValidationError("PAN is required for this entity type");
      }

      validatePAN(pan);
    }

    // uniqueness enforcement only if PAN exists
    if (pan) {
      const panExists = await tx.entity.findUnique({
        where: {
          pan,
          deleted_at: null,
        },
      });

      if (panExists) {
        throw new ConflictError("Entity with this PAN already exists");
      }
    }

    const validatedCustomFields = validateCustomFields(data.custom_fields);

    const entity = await tx.entity.create({
      data: {
        entity_type: data.entity_type,
        name: data.name,
        pan,
        email: data.email,
        primary_phone: data.primary_phone,
        contact_person: data.contact_person ?? null,
        secondary_phone: data.secondary_phone ?? null,
        address_line1: data.address_line1 ?? null,
        address_line2: data.address_line2 ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        pincode: data.pincode ?? null,

        status: data.status ?? "ACTIVE",
        created_by,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (validatedCustomFields.length > 0) {
      await tx.entityCustomField.createMany({
        data: validatedCustomFields.map((f) => ({
          entity_id: entity.id,
          name: f.name,
          value: f.value,
        })),
      });
    }

    const fullEntity = await tx.entity.findUnique({
      where: { id: entity.id },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        custom_fields: true,
      },
    });

    return fullEntity;
  });
};

const bulkCreateEntities = async (entities, created_by) => {
  const result = { added: [], skipped: [], failed: [] };
  if (!entities.length) return result;

  return prisma.$transaction(async (tx) => {
    const batchTime = new Date();

    // ==================================================
    // 1. Business validation per row
    // ==================================================
    const validEntities = [];
    const indexMap = new Map();

    entities.forEach((entity, index) => {
      try {
        const pan = entity.pan ? entity.pan.toUpperCase() : null;

        // PAN validation rule
        if (entity.entity_type !== "UN_REGISTRED") {
          if (!pan) throw new Error("PAN is required for this entity type");
          validatePAN(pan);
        }

        const validatedCustomFields = validateCustomFields(
          entity.custom_fields,
        );

        const normalized = {
          ...entity,
          pan,
          custom_fields: validatedCustomFields,
        };

        validEntities.push(normalized);
        indexMap.set(normalized, index);
      } catch (err) {
        result.failed.push({
          row: index + 2,
          reason: err.message,
        });
      }
    });

    if (!validEntities.length) return result;

    // ==================================================
    // 2. Detect duplicates (PAN only, active entities)
    // ==================================================
    const pans = validEntities.map((e) => e.pan).filter(Boolean);

    let existingPANs = new Set();

    if (pans.length) {
      const existing = await tx.entity.findMany({
        where: {
          deleted_at: null,
          pan: { in: pans },
        },
        select: { pan: true },
      });

      existingPANs = new Set(existing.map((e) => e.pan));
    }

    const toInsert = [];

    for (const entity of validEntities) {
      const originalIndex = indexMap.get(entity);

      if (entity.pan && existingPANs.has(entity.pan)) {
        result.skipped.push({
          row: originalIndex + 2,
          reason: "Duplicate PAN",
        });
      } else {
        toInsert.push(entity);
      }
    }

    if (!toInsert.length) return result;

    // ==================================================
    // 3. Bulk insert entities
    // ==================================================
    await tx.entity.createMany({
      data: toInsert.map((e) => ({
        entity_type: e.entity_type,
        name: e.name,
        pan: e.pan,
        email: e.email,
        primary_phone: e.primary_phone,
        contact_person: e.contact_person ?? null,
        secondary_phone: e.secondary_phone ?? null,
        address_line1: e.address_line1 ?? null,
        address_line2: e.address_line2 ?? null,
        city: e.city ?? null,
        state: e.state ?? null,
        pincode: e.pincode ?? null,
        status: e.status ?? "ACTIVE",
        created_by,
      })),
      skipDuplicates: true, // DB safety net (unique PAN index)
    });

    // ==================================================
    // 4. Fetch inserted entities (batch-safe)
    // ==================================================
    const insertedEntities = await tx.entity.findMany({
      where: {
        created_by,
        created_at: { gte: batchTime },
      },
      include: {
        creator: true,
        custom_fields: true,
        _count: { select: { tasks: true } },
      },
    });

    // Build lookup
    const lookupByPan = new Map();
    const lookupByTempKey = new Map();

    insertedEntities.forEach((e) => {
      if (e.pan) {
        lookupByPan.set(e.pan, e);
      } else {
        const key = `${e.name}|${e.primary_phone || ""}`;
        lookupByTempKey.set(key, e);
      }
    });

    // ==================================================
    // 5. Insert custom fields + build response
    // ==================================================
    const customFieldRows = [];

    for (const entity of toInsert) {
      const originalIndex = indexMap.get(entity);

      let dbEntity = null;

      if (entity.pan) {
        dbEntity = lookupByPan.get(entity.pan);
      } else {
        const key = `${entity.name}|${entity.primary_phone || ""}`;
        dbEntity = lookupByTempKey.get(key);
      }

      if (!dbEntity) {
        result.skipped.push({
          row: originalIndex + 2,
          reason: "Entity already existed (race condition)",
        });
        continue;
      }

      for (const field of entity.custom_fields || []) {
        customFieldRows.push({
          entity_id: dbEntity.id,
          name: field.name,
          value: field.value,
        });
      }

      result.added.push({
        row: originalIndex + 2,
        entity: dbEntity,
      });
    }

    if (customFieldRows.length) {
      await tx.entityCustomField.createMany({ data: customFieldRows });
    }

    return result;
  });
};

const updateEntity = async (entity_id, data, updated_by) => {
  return prisma.$transaction(async (tx) => {
    const entity = await tx.entity.findUnique({
      where: { id: entity_id },
    });

    if (!entity) throw new NotFoundError("Entity not found");
    if (entity.deleted_at)
      throw new ValidationError("Cannot update deleted entity");

    // detect if client actually sent pan key
    const panProvided = Object.prototype.hasOwnProperty.call(data, "pan");

    // compute next TYPE
    const nextType = Object.prototype.hasOwnProperty.call(data, "entity_type")
      ? data.entity_type
      : entity.entity_type;

    // compute next PAN honoring null clearing
    let nextPAN = entity.pan;

    if (panProvided) {
      if (data.pan === null) {
        nextPAN = null; // explicit clear
      } else {
        nextPAN = data.pan.toUpperCase();
      }
    }

    // enforce conditional PAN rule
    if (nextType !== "UN_REGISTRED" && !nextPAN) {
      throw new ValidationError("PAN is required for this entity type");
    }

    // validate PAN only when present and non-null
    if (nextPAN) {
      validatePAN(nextPAN);
    }

    // uniqueness check if PAN changed
    if (panProvided && nextPAN !== entity.pan && nextPAN) {
      const panExists = await tx.entity.findUnique({
        where: { pan: nextPAN },
      });

      if (panExists) {
        throw new ConflictError("Entity with this PAN already exists");
      }
    }

    // ---------- CUSTOM FIELDS SYNC (NEW) ----------

    if (Object.prototype.hasOwnProperty.call(data, "custom_fields")) {
      const validatedFields = validateCustomFields(data.custom_fields);

      const existingFields = await tx.entityCustomField.findMany({
        where: { entity_id },
      });

      const existingMap = new Map(
        existingFields.map((f) => [f.name.toLowerCase(), f]),
      );

      const incomingMap = new Map(
        validatedFields.map((f) => [f.name.toLowerCase(), f]),
      );

      // create or update
      for (const field of validatedFields) {
        const key = field.name.toLowerCase();
        const existing = existingMap.get(key);

        if (!existing) {
          // create
          await tx.entityCustomField.create({
            data: {
              entity_id,
              name: field.name,
              value: field.value,
            },
          });
        } else if (existing.value !== field.value) {
          // update
          await tx.entityCustomField.update({
            where: { id: existing.id },
            data: { value: field.value },
          });
        }
      }

      // delete removed
      for (const existing of existingFields) {
        if (!incomingMap.has(existing.name.toLowerCase())) {
          await tx.entityCustomField.delete({
            where: { id: existing.id },
          });
        }
      }
    }
    // ---------- UPDATE ENTITY CORE ----------
    const updatedEntity = await tx.entity.update({
      where: { id: entity_id },
      data: {
        entity_type: Object.prototype.hasOwnProperty.call(data, "entity_type")
          ? data.entity_type
          : undefined,

        name: Object.prototype.hasOwnProperty.call(data, "name")
          ? data.name
          : undefined,

        pan: panProvided ? nextPAN : undefined,

        email: Object.prototype.hasOwnProperty.call(data, "email")
          ? data.email
          : undefined,

        primary_phone: Object.prototype.hasOwnProperty.call(
          data,
          "primary_phone",
        )
          ? data.primary_phone
          : undefined,

        contact_person: Object.prototype.hasOwnProperty.call(
          data,
          "contact_person",
        )
          ? data.contact_person
          : undefined,

        secondary_phone: Object.prototype.hasOwnProperty.call(
          data,
          "secondary_phone",
        )
          ? data.secondary_phone
          : undefined,

        address_line1: Object.prototype.hasOwnProperty.call(
          data,
          "address_line1",
        )
          ? data.address_line1
          : undefined,

        address_line2: Object.prototype.hasOwnProperty.call(
          data,
          "address_line2",
        )
          ? data.address_line2
          : undefined,

        city: Object.prototype.hasOwnProperty.call(data, "city")
          ? data.city
          : undefined,

        state: Object.prototype.hasOwnProperty.call(data, "state")
          ? data.state
          : undefined,

        pincode: Object.prototype.hasOwnProperty.call(data, "pincode")
          ? data.pincode
          : undefined,

        status: Object.prototype.hasOwnProperty.call(data, "status")
          ? data.status
          : undefined,

        updated_by,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        updater: { select: { id: true, name: true, email: true } },
        custom_fields: true,
      },
    });

    return updatedEntity;
  });
};

/**
 * Hard delete an entity
 */
const deleteEntity = async (entity_id, deleted_by) => {
  return prisma.$transaction(async (tx) => {
    const entity = await tx.entity.findUnique({
      where: { id: entity_id },
      select: { id: true },
    });

    if (!entity) {
      throw new NotFoundError("Entity not found");
    }

    // Block if tasks exist
    const taskCount = await tx.task.count({
      where: { entity_id },
    });

    if (taskCount > 0) {
      throw new Error("Entity cannot be deleted because it has linked tasks");
    }

    // Soft delete only
    await tx.entity.update({
      where: { id: entity_id },
      data: {
        deleted_at: new Date(),
        deleted_by,
      },
    });

    return {
      id: entity_id,
      deleted: true,
      soft: true,
    };
  });
};

/**
 * List entities with filters
 */
const listEntities = async (filters = {}) => {
  // pagination normalization + cap
  const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
  const pageSize = Math.min(
    Number(filters.page_size) > 0 ? Number(filters.page_size) : 20,
    50,
  );

  const isCompact =
    filters.compact === "1" ||
    filters.compact === 1 ||
    filters.compact === true;

  const where = {
    deleted_at: null,
  };

  // filters
  if (filters.status) where.status = filters.status;
  if (filters.entity_type) where.entity_type = filters.entity_type;
  if (filters.state) where.state = filters.state;

  const hasSearch = filters.search && filters.search.trim();
  const searchTerm = hasSearch ? filters.search.trim() : null;

  /* --------------------------------------------------
      COMPACT FAST PATH (ranked full-text search)
     -------------------------------------------------- */
  if (isCompact && hasSearch) {
    const compactLimit = 100;

    const rows = await prisma.$queryRaw`
      SELECT id, name, email, pan
      FROM "Entity"
      WHERE deleted_at IS NULL
        AND (
          to_tsvector(
            'english',
            name || ' ' ||
            COALESCE(email, '') || ' ' ||
            COALESCE(pan, '') || ' ' ||
            COALESCE(primary_phone, '') || ' ' ||
            COALESCE(contact_person, '')
          ) @@ plainto_tsquery('english', ${searchTerm})
        )
      ORDER BY ts_rank(
        to_tsvector(
          'english',
          name || ' ' ||
          COALESCE(email, '') || ' ' ||
          COALESCE(pan, '') || ' ' ||
          COALESCE(primary_phone, '') || ' ' ||
          COALESCE(contact_person, '')
        ),
        plainto_tsquery('english', ${searchTerm})
      ) DESC
      LIMIT ${compactLimit}
      OFFSET ${(page - 1) * pageSize}
    `;

    return {
      data: rows,
      pagination: {
        page,
        page_size: compactLimit,
        total_items: rows.length,
        total_pages: 1,
        has_more: rows.length === compactLimit,
      },
    };
  }

  /* --------------------------------------------------
      NORMAL SEARCH (2-step ID filtering)
     -------------------------------------------------- */
  if (hasSearch) {
    const searchLimit = isCompact ? pageSize : 1000;

    const searchResults = await prisma.$queryRaw`
      SELECT id
      FROM "Entity"
      WHERE deleted_at IS NULL
        AND (
          to_tsvector(
            'english',
            name || ' ' ||
            COALESCE(email, '') || ' ' ||
            COALESCE(pan, '') || ' ' ||
            COALESCE(primary_phone, '') || ' ' ||
            COALESCE(contact_person, '')
          ) @@ plainto_tsquery('english', ${searchTerm})
        )
      LIMIT ${searchLimit}
    `;

    const entityIds = searchResults.map((r) => r.id);

    if (entityIds.length === 0) {
      return {
        data: [],
        pagination: {
          page,
          page_size: pageSize,
          total_items: 0,
          total_pages: 0,
          has_more: false,
        },
      };
    }

    where.id = { in: entityIds };
  }

  const orderBy = filters.orderBy || { created_at: "desc" };

  /* --------------------------------------------------
     📦 NORMAL / FULL FETCH
     -------------------------------------------------- */

  const [items, total] = await Promise.all([
    prisma.entity.findMany({
      where,
      ...(isCompact
        ? {
            select: {
              id: true,
              name: true,
              email: true,
              pan: true,
            },
          }
        : {
            include: {
              creator: {
                select: { id: true, name: true, email: true },
              },
              custom_fields: {
                orderBy: { name: "asc" },
              },
              _count: {
                select: { tasks: true },
              },
            },
          }),
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),

    prisma.entity.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    data: items,
    pagination: {
      page,
      page_size: pageSize,
      total_items: total,
      total_pages: totalPages,
      has_more: page < totalPages,
    },
  };
};

/**
 * Get entity by ID
 */
const getEntityById = async (entity_id) => {
  const entity = await prisma.entity.findFirst({
    where: {
      id: entity_id,
      deleted_at: null,
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      updater: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },

      custom_fields: {
        orderBy: { name: "asc" },
      },

      _count: {
        select: {
          tasks: true,
        },
      },
    },
  });

  if (!entity) {
    throw new NotFoundError("Entity not found");
  }

  return entity;
};

export {
  createEntity,
  updateEntity,
  deleteEntity,
  listEntities,
  getEntityById,
  bulkCreateEntities,
};
