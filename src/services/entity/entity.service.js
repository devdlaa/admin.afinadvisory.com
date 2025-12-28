import { PrismaClient } from "@prisma/client";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../../utils/server/errors.js";

const prisma = new PrismaClient();

// PAN format: ABCDE1234F (5 letters + 4 digits + 1 letter)
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// TAN format: ABCD12345E (4 letters + 5 digits + 1 letter)
const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/;

const validatePAN = (pan) => {
  if (!PAN_REGEX.test(pan)) {
    throw new ValidationError(
      "Invalid PAN format. Expected format: ABCDE1234F (5 letters + 4 digits + 1 letter)"
    );
  }
};

const validateTAN = (tan) => {
  if (tan && !TAN_REGEX.test(tan)) {
    throw new ValidationError(
      "Invalid TAN format. Expected format: ABCD12345E (4 letters + 5 digits + 1 letter)"
    );
  }
};

export const createEntity = async (data, created_by) => {
  return prisma.$transaction(async (tx) => {
    // Validate PAN format
    validatePAN(data.pan);

    // Validate TAN format (if provided)
    validateTAN(data.tan);

    // Check if PAN already exists
    const panExists = await tx.entity.findUnique({
      where: { pan: data.pan },
    });
    if (panExists) {
      throw new ConflictError("Entity with this PAN already exists");
    }

    // If TAN is provided, check uniqueness
    if (data.tan) {
      const tanExists = await tx.entity.findFirst({
        where: {
          tan: data.tan,
          deleted_at: null,
        },
      });
      if (tanExists) {
        throw new ConflictError("Entity with this TAN already exists");
      }
    }

    // Create entity
    const entity = await tx.entity.create({
      data: {
        entity_type: data.entity_type,
        name: data.name,
        pan: data.pan,
        tan: data.tan ?? null,
        email: data.email,
        primary_phone: data.primary_phone,
        contact_person: data.contact_person ?? null,
        secondary_phone: data.secondary_phone ?? null,
        address_line1: data.address_line1 ?? null,
        address_line2: data.address_line2 ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        pincode: data.pincode ?? null,
        is_retainer: data.is_retainer ?? false,
        status: data.status ?? "ACTIVE",
        created_by,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return entity;
  });
};

export const updateEntity = async (entity_id, data, updated_by) => {
  return prisma.$transaction(async (tx) => {
    // Fetch existing entity
    const entity = await tx.entity.findUnique({
      where: { id: entity_id },
      include: {
        registrations: {
          where: {
            deleted_at: null,
            status: "ACTIVE",
          },
        },
      },
    });

    if (!entity) {
      throw new NotFoundError("Entity not found");
    }

    if (entity.deleted_at) {
      throw new ValidationError("Cannot update deleted entity");
    }

    // Validate PAN format (if being updated)
    if (data.pan) {
      validatePAN(data.pan);
    }

    // Validate TAN format (if being updated)
    if (data.tan !== undefined) {
      validateTAN(data.tan);
    }

    // Check PAN uniqueness (if changed)
    if (data.pan && data.pan !== entity.pan) {
      const panExists = await tx.entity.findUnique({
        where: { pan: data.pan },
      });
      if (panExists) {
        throw new ConflictError("Entity with this PAN already exists");
      }
    }

    // Check TAN uniqueness (if provided and changed)
    if (data.tan && data.tan !== entity.tan) {
      const tanExists = await tx.entity.findFirst({
        where: {
          tan: data.tan,
          deleted_at: null,
          id: { not: entity_id },
        },
      });
      if (tanExists) {
        throw new ConflictError("Entity with this TAN already exists");
      }
    }

    // Handle is_retainer toggle with validation
    if (
      data.is_retainer !== undefined &&
      data.is_retainer !== entity.is_retainer
    ) {
      // If disabling retainer, check for active registrations
      if (!data.is_retainer && entity.is_retainer) {
        if (entity.registrations.length > 0) {
          throw new ValidationError(
            "Cannot disable retainer status. Entity has active registrations. Please deactivate registrations first."
          );
        }
      }
    }

    // Update entity
    const updatedEntity = await tx.entity.update({
      where: { id: entity_id },
      data: {
        entity_type: data.entity_type ?? undefined,
        name: data.name ?? undefined,
        pan: data.pan ?? undefined,
        tan: data.tan ?? undefined,
        email: data.email ?? undefined,
        primary_phone: data.primary_phone ?? undefined,
        contact_person: data.contact_person ?? undefined,
        secondary_phone: data.secondary_phone ?? undefined,
        address_line1: data.address_line1 ?? undefined,
        address_line2: data.address_line2 ?? undefined,
        city: data.city ?? undefined,
        state: data.state ?? undefined,
        pincode: data.pincode ?? undefined,
        is_retainer: data.is_retainer ?? undefined,
        status: data.status ?? undefined,
        updated_by,
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
      },
    });

    return updatedEntity;
  });
};

/**
 * Soft delete an entity
 */
export const deleteEntity = async (entity_id, deleted_by) => {
  return prisma.$transaction(async (tx) => {
    const entity = await tx.entity.findUnique({
      where: { id: entity_id },
      include: {
        registrations: {
          where: { deleted_at: null },
        },
      },
    });

    if (!entity) {
      throw new NotFoundError("Entity not found");
    }

    if (entity.deleted_at) {
      throw new ValidationError("Entity already deleted");
    }

    // Check if entity has active registrations
    if (entity.registrations.length > 0) {
      throw new ValidationError(
        "Cannot delete entity with active registrations. Please delete registrations first."
      );
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
export const listEntities = async (filters = {}) => {
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

  // Boolean coercion for is_retainer
  if (filters.is_retainer !== undefined) {
    if (filters.is_retainer === true || filters.is_retainer === "true")
      where.is_retainer = true;
    else if (filters.is_retainer === false || filters.is_retainer === "false")
      where.is_retainer = false;
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
            registrations: {
              where: { deleted_at: null },
            },
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
export const getEntityById = async (entity_id) => {
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
      registrations: {
        where: { deleted_at: null },
        include: {
          registrationType: true,
        },
      },
      group_members: {
        include: {
          group: true,
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

/**
 * Toggle retainer status
 */
export const toggleRetainerStatus = async (
  entity_id,
  is_retainer,
  updated_by
) => {
  return prisma.$transaction(async (tx) => {
    const entity = await tx.entity.findUnique({
      where: { id: entity_id },
    });

    if (!entity) {
      throw new NotFoundError("Entity not found");
    }

    if (entity.deleted_at) {
      throw new ValidationError("Cannot update deleted entity");
    }

    // If disabling retainer, check for active registrations
    if (!is_retainer && entity.is_retainer) {
      const activeRegistrations = await tx.entityRegistration.count({
        where: {
          entity_id,
          deleted_at: null,
          status: "ACTIVE",
        },
      });

      if (activeRegistrations > 0) {
        throw new ValidationError(
          "Cannot disable retainer status. Entity has active registrations. Please deactivate registrations first."
        );
      }
    }

    const updatedEntity = await tx.entity.update({
      where: { id: entity_id },
      data: {
        is_retainer,
        updated_by,
      },
    });

    return updatedEntity;
  });
};

export {
  createEntity,
  updateEntity,
  deleteEntity,
  listEntities,
  getEntityById,
  toggleRetainerStatus,
};
