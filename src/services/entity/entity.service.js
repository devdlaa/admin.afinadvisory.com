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
      "Invalid PAN format. Expected format: ABCDE1234F (5 letters + 4 digits + 1 letter)"
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
        where: { pan },
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
        existingFields.map((f) => [f.name.toLowerCase(), f])
      );

      const incomingMap = new Map(
        validatedFields.map((f) => [f.name.toLowerCase(), f])
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
          "primary_phone"
        )
          ? data.primary_phone
          : undefined,

        contact_person: Object.prototype.hasOwnProperty.call(
          data,
          "contact_person"
        )
          ? data.contact_person
          : undefined,

        secondary_phone: Object.prototype.hasOwnProperty.call(
          data,
          "secondary_phone"
        )
          ? data.secondary_phone
          : undefined,

        address_line1: Object.prototype.hasOwnProperty.call(
          data,
          "address_line1"
        )
          ? data.address_line1
          : undefined,

        address_line2: Object.prototype.hasOwnProperty.call(
          data,
          "address_line2"
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
 * Soft delete an entity
 */
const deleteEntity = async (entity_id, deleted_by) => {
  return prisma.$transaction(async (tx) => {
    const entity = await tx.entity.findUnique({
      where: { id: entity_id },
    });

    if (!entity) {
      throw new NotFoundError("Entity not found");
    }

    if (entity.deleted_at) {
      throw new ValidationError("Entity already deleted");
    }

    // Soft delete
    const deletedEntity = await tx.entity.update({
      where: { id: entity_id },
      data: {
        deleted_by,
        deleted_at: new Date(),
        status: "SUSPENDED",
      },
    });

    return deletedEntity;
  });
};

/**
 * List entities with filters
 */
const listEntities = async (filters = {}) => {
  // pagination normalization
  const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
  const pageSize =
    Number(filters.page_size) > 0 ? Number(filters.page_size) : 20;

  const where = {
    deleted_at: null,
  };

  // Filter by status
  if (filters.status) {
    where.status = filters.status;
  }

  // Filter by entity_type
  if (filters.entity_type) {
    where.entity_type = filters.entity_type;
  }

  // Filter by state
  if (filters.state) {
    where.state = filters.state;
  }

  // OPTIMIZED SEARCH - Replace the old OR search with full-text search
  if (filters.search && filters.search.trim()) {
    const searchTerm = filters.search.trim();

    // Use full-text search for better performance
    const searchResults = await prisma.$queryRaw`
      SELECT id 
      FROM "Entity"
      WHERE deleted_at IS NULL
        AND (
          to_tsvector('english', 
            name || ' ' || 
            COALESCE(email, '') || ' ' || 
            COALESCE(pan, '') || ' ' || 
            COALESCE(primary_phone, '') || ' ' || 
            COALESCE(contact_person, '')
          ) @@ plainto_tsquery('english', ${searchTerm})
        )
      LIMIT 1000
    `;

    const entityIds = searchResults.map((r) => r.id);

    // If no results found, return empty
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

  const [items, total] = await Promise.all([
    prisma.entity.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
      },
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
};
