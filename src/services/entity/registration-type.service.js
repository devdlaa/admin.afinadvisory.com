import { PrismaClient } from "@prisma/client";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../../utils/server/errors.js";

const prisma = new PrismaClient();

const normalizeAndValidateCode = (code) => {
  if (typeof code !== "string") {
    throw new ValidationError("Code must be a string");
  }

  const normalized = code.trim().toUpperCase();

  if (normalized.length === 0) {
    throw new ValidationError("Code cannot be empty");
  }

  if (normalized.length > 50) {
    throw new ValidationError("Code must not exceed 50 characters");
  }

  // Allow A–Z, 0–9, underscore, hyphen
  if (!/^[A-Z0-9_-]+$/.test(normalized)) {
    throw new ValidationError(
      "Code may contain only A–Z, digits, hyphen (-), or underscore (_)"
    );
  }

  return normalized;
};

export const createRegistrationType = async (data) => {
  const code = normalizeAndValidateCode(data.code);

  const codeExists = await prisma.registrationType.findUnique({
    where: { code },
  });

  if (codeExists) {
    throw new ConflictError("Registration type with this code already exists");
  }

  return prisma.registrationType.create({
    data: {
      code,
      name: data.name ?? null,
      description: data.description ?? null,
      is_active: data.is_active ?? false,
      validation_regex: data.validation_regex ?? null,
      validation_hint: data.validation_hint ?? null,
    },
  });
};

export const updateRegistrationType = async (id, data) => {
  return prisma.$transaction(async (tx) => {
    const regType = await tx.registrationType.findUnique({
      where: { id },
    });

    if (!regType) {
      throw new NotFoundError("Registration type not found");
    }

    // CODE normalize + uniqueness checks
    let updatedCode;

    if (data.code !== undefined) {
      updatedCode = normalizeAndValidateCode(data.code);

      if (updatedCode !== regType.code) {
        const codeExists = await tx.registrationType.findUnique({
          where: { code: updatedCode },
        });

        if (codeExists) {
          throw new ConflictError(
            "Registration type with this code already exists"
          );
        }
      }
    }

    // Update
    return tx.registrationType.update({
      where: { id },
      data: {
        code: updatedCode ?? undefined,
        name: data.name ?? undefined,
        description: data.description ?? undefined,

        // single, explicit activation flag
        is_active: data.is_active ?? undefined,

        validation_regex: data.validation_regex ?? undefined,
        validation_hint: data.validation_hint ?? undefined,
      },
    });
  });
};

export const deleteRegistrationType = async (id) => {
  return prisma.$transaction(async (tx) => {
    const regType = await tx.registrationType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            registrations: true,
            compliance_rules: true,
          },
        },
      },
    });

    if (!regType) {
      throw new NotFoundError("Registration type not found");
    }

    if (regType._count.registrations > 0) {
      throw new ValidationError(
        "Cannot delete registration type with existing registrations"
      );
    }

    if (regType._count.compliance_rules > 0) {
      throw new ValidationError(
        "Cannot delete registration type with existing compliance rules"
      );
    }

    return tx.registrationType.delete({ where: { id } });
  });
};

export const listRegistrationTypes = async (filters = {}) => {
  // pagination normalization
  const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
  const pageSize =
    Number(filters.page_size) > 0 ? Number(filters.page_size) : 10;

  // boolean normalization
  let isActive;
  if (filters.is_active !== undefined) {
    if (filters.is_active === true || filters.is_active === "true")
      isActive = true;
    if (filters.is_active === false || filters.is_active === "false")
      isActive = false;
  }

  const where = {};

  if (isActive !== undefined) {
    where.is_active = isActive;
  }

  if (filters.search && filters.search.trim()) {
    const search = filters.search.trim();

    where.OR = [
      {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];

    // search by code only when valid pattern
    if (/^[A-Za-z]+$/.test(search)) {
      where.OR.push({
        code: {
          contains: search.toUpperCase(),
        },
      });
    }
  }

  const [items, total] = await Promise.all([
    prisma.registrationType.findMany({
      where,
      include: {
        _count: {
          select: {
            registrations: true,
            compliance_rules: true,
          },
        },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),

    prisma.registrationType.count({ where }),
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

export const getRegistrationTypeById = async (id) => {
  const regType = await prisma.registrationType.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          registrations: true,
          compliance_rules: true,
        },
      },
    },
  });

  if (!regType) {
    throw new NotFoundError("Registration type not found");
  }

  return regType;
};
