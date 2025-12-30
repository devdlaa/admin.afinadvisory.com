import { PrismaClient } from "@prisma/client";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  BadRequestError,
} from "../utils/errors.js";

const prisma = new PrismaClient();

/**
 * Normalize and validate compliance_code
 */
const normalizeAndValidateComplianceCode = (code) => {
  if (typeof code !== "string") {
    throw new BadRequestError("compliance_code must be a string");
  }

  const normalized = code.trim().toUpperCase();

  if (normalized.length === 0) {
    throw new BadRequestError("compliance_code cannot be empty");
  }

  if (normalized.length > 100) {
    throw new BadRequestError("compliance_code must not exceed 100 characters");
  }

  // Allow A–Z, 0–9 and underscores between tokens
  if (!/^[A-Z0-9]+(_[A-Z0-9]+)*$/.test(normalized)) {
    throw new BadRequestError(
      "compliance_code must contain only uppercase letters, digits and underscores, " +
        "and must not start or end with an underscore"
    );
  }

  return normalized;
};

/**
 * Indian FY-based anchor months (auto-calculated)
 */
const INDIAN_ANCHOR_MONTHS = {
  MONTHLY: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  QUARTERLY: [6, 9, 12, 3], // Jun, Sep, Dec, Mar
  HALFYEARLY: [9, 3], // Sep, Mar
  YEARLY: [3], // Mar
};

/**
 * Period label type mapping (auto-derived)
 */
const PERIOD_LABEL_MAP = {
  MONTHLY: "MONTH",
  QUARTERLY: "QUARTER",
  HALFYEARLY: "HALFYEAR",
  YEARLY: "YEAR",
};

/**
 * Create compliance rule
 */

// Anchor months represent the month in which the compliance period ENDS
// Cron generates tasks when current month ∈ anchor_months
// Indian FY = April–March, so:
//  Q1 ends Jun, Q2 ends Sep, Q3 ends Dec, Q4 ends Mar

export const createComplianceRule = async (data, admin_id) => {
  return prisma.$transaction(async (tx) => {
    // 1. Normalize & validate compliance code
    const compliance_code = normalizeAndValidateComplianceCode(
      data.compliance_code
    );

    // 2. Validate registration type exists and is active
    const registrationType = await tx.registrationType.findUnique({
      where: { id: data.registration_type_id },
    });

    if (!registrationType || !registrationType.is_active) {
      throw new NotFoundError("Invalid or inactive registration type");
    }

    // 3. Auto-derive system fields
    const anchor_months = INDIAN_ANCHOR_MONTHS[data.frequency_type];
    const period_label_type = PERIOD_LABEL_MAP[data.frequency_type];

    // 4. Create compliance rule
    try {
      const rule = await tx.complianceRule.create({
        data: {
          compliance_code,
          name: data.name,
          registration_type_id: data.registration_type_id,

          // Auto-calculated/derived fields
          frequency_type: data.frequency_type,
          anchor_months,
          period_label_type,

          // User-provided fields
          due_day: data.due_day,
          due_month_offset: data.due_month_offset ?? 0,
          grace_days: data.grace_days ?? 0,
          is_active: data.is_active ?? true,

          created_by: admin_id,
        },
        include: {
          registrationType: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return rule;
    } catch (err) {
      if (err.code === "P2002") {
        throw new ConflictError(
          "Compliance rule with this compliance code already exists"
        );
      }
      if (err.code === "P2003") {
        throw new NotFoundError("Invalid registration type");
      }
      throw err;
    }
  });
};

export const updateComplianceRule = async (id, data, admin_id) => {
  return prisma.$transaction(async (tx) => {
    const rule = await tx.complianceRule.findUnique({
      where: { id },
    });

    if (!rule) {
      throw new NotFoundError("Compliance rule not found");
    }

    // --------------------------------------------
    // 1) COMPLIANCE CODE UPDATE using shared helper
    // --------------------------------------------
    let updatedComplianceCode;

    if (data.compliance_code !== undefined) {
      updatedComplianceCode = normalizeAndValidateComplianceCode(
        data.compliance_code
      );

      // uniqueness only if changed
      if (updatedComplianceCode !== rule.compliance_code) {
        const exists = await tx.complianceRule.findUnique({
          where: { compliance_code: updatedComplianceCode },
        });

        if (exists) {
          throw new ConflictError(
            "Compliance rule with this compliance code already exists"
          );
        }
      }
    }

    // --------------------------------------------
    // 2) Registration type validation
    // --------------------------------------------
    if (data.registration_type_id) {
      const registrationType = await tx.registrationType.findUnique({
        where: { id: data.registration_type_id },
      });

      if (!registrationType || !registrationType.is_active) {
        throw new NotFoundError("Invalid or inactive registration type");
      }
    }

    // --------------------------------------------
    // 3) Auto frequency → anchors & labels
    // --------------------------------------------
    let anchor_months;
    let period_label_type;

    if (data.frequency_type) {
      anchor_months = INDIAN_ANCHOR_MONTHS[data.frequency_type];
      period_label_type = PERIOD_LABEL_MAP[data.frequency_type];
    }

    // --------------------------------------------
    // 4) Prevent disable if active templates exist
    // --------------------------------------------
    if (data.is_active === false && rule.is_active === true) {
      const activeTemplates = await tx.taskTemplate.count({
        where: {
          compliance_rule_id: id,
          is_active: true,
        },
      });

      if (activeTemplates > 0) {
        throw new ValidationError(
          `Cannot disable compliance rule. It has ${activeTemplates} active task template(s). Please disable those templates first.`
        );
      }
    }

    // --------------------------------------------
    // 5) Final update
    // --------------------------------------------
    const updatedRule = await tx.complianceRule.update({
      where: { id },
      data: {
        compliance_code: updatedComplianceCode ?? undefined,

        name: data.name ?? undefined,
        registration_type_id: data.registration_type_id ?? undefined,

        frequency_type: data.frequency_type ?? undefined,
        anchor_months: anchor_months ?? undefined,
        period_label_type: period_label_type ?? undefined,

        due_day: data.due_day ?? undefined,
        due_month_offset: data.due_month_offset ?? undefined,
        grace_days: data.grace_days ?? undefined,

        is_active: data.is_active ?? undefined,

        updated_by: admin_id,
      },
      include: {
        registrationType: true,
        creator: { select: { id: true, name: true, email: true } },
        updater: { select: { id: true, name: true, email: true } },
      },
    });

    return updatedRule;
  });
};

/**
 * Get compliance rule by ID
 */
export const getComplianceRuleById = async (id) => {
  const rule = await prisma.complianceRule.findUnique({
    where: { id },
    include: {
      registrationType: true,
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
          task_templates: true,
        },
      },
    },
  });

  if (!rule) {
    throw new NotFoundError("Compliance rule not found");
  }

  return rule;
};

/**
 * List compliance rules with filters + pagination
 */
export const listComplianceRules = async (filters = {}) => {
  // pagination normalization
  const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
  const pageSize =
    Number(filters.page_size) > 0 ? Number(filters.page_size) : 10;

  const where = {};

  // filter by registration type
  if (filters.registration_type_id) {
    where.registration_type_id = filters.registration_type_id;
  }

  // boolean normalization for is_active
  if (filters.is_active !== undefined) {
    if (filters.is_active === true || filters.is_active === "true") {
      where.is_active = true;
    } else if (filters.is_active === false || filters.is_active === "false") {
      where.is_active = false;
    }
  }

  // frequency
  if (filters.frequency_type) {
    where.frequency_type = filters.frequency_type;
  }

  // search by name or compliance code
  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim();

    where.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { compliance_code: { contains: s, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.complianceRule.findMany({
      where,
      include: {
        registrationType: true,
        _count: {
          select: {
            task_templates: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),

    prisma.complianceRule.count({ where }),
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
