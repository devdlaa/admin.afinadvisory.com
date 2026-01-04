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

    return entity;
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

    const nextType = data.entity_type ?? entity.entity_type;
    const nextPAN = data.pan?.toUpperCase() ?? entity.pan;

    // enforce conditional PAN rule
    if (nextType !== "UN_REGISTRED" && !nextPAN) {
      throw new ValidationError("PAN is required for this entity type");
    }

    // validate PAN only when present
    if (nextPAN) {
      validatePAN(nextPAN);
    }

    // uniqueness check if PAN changed
    if (nextPAN && nextPAN !== entity.pan) {
      const panExists = await tx.entity.findUnique({
        where: { pan: nextPAN },
      });

      if (panExists) {
        throw new ConflictError("Entity with this PAN already exists");
      }
    }

    const updatedEntity = await tx.entity.update({
      where: { id: entity_id },
      data: {
        entity_type: data.entity_type ?? undefined,
        name: data.name ?? undefined,
        pan: nextPAN ?? undefined,
        email: data.email ?? undefined,
        primary_phone: data.primary_phone ?? undefined,
        contact_person: data.contact_person ?? undefined,
        secondary_phone: data.secondary_phone ?? undefined,
        address_line1: data.address_line1 ?? undefined,
        address_line2: data.address_line2 ?? undefined,
        city: data.city ?? undefined,
        state: data.state ?? undefined,
        pincode: data.pincode ?? undefined,
        status: data.status ?? undefined,
        updated_by,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        updater: { select: { id: true, name: true, email: true } },
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

  // Search by name, email, pan, phone, contact_person
  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim();

    where.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { email: { contains: s, mode: "insensitive" } },
      { pan: { contains: s, mode: "insensitive" } },
      { primary_phone: { contains: s } },
      { contact_person: { contains: s, mode: "insensitive" } },
    ];
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
