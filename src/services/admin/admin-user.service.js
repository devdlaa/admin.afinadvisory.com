import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../../utils/server/errors.js";

import { ADMIN_ROLES } from "@/schemas/core/adminUser.schema.js";

import jwt from "jsonwebtoken";

const INVITE_JWT_SECRET = process.env.JWT_SECRET;
const INVITE_TOKEN_TTL = "24h";
const RESEND_COOLDOWN_MINUTES = 15;
const PASSWORD_RESET_COOLDOWN_MINUTES = 15;
const ONBOARDING_RESET_COOLDOWN_MINUTES = 15;

const prisma = new PrismaClient();

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const generateUserCode = async () => {
  const counter = await prisma.adminUserCounter.upsert({
    where: { id: "default" },
    update: {
      current_count: { increment: 1 },
    },
    create: {
      id: "default",
      current_count: 1,
    },
  });

  return `ADMIN_USER_${String(counter.current_count).padStart(3, "0")}`;
};

/* -------------------------------------------------------------------
   CREATE ADMIN USER  (✔ permissions allowed here)
------------------------------------------------------------------- */
export const createAdminUser = async (data, created_by) => {
  return prisma.$transaction(async (tx) => {
    // validate role
    if (data.admin_role && !ADMIN_ROLES.includes(data.admin_role)) {
      throw new ValidationError("Invalid app role");
    }

    // uniqueness
    const emailExists = await tx.adminUser.findUnique({
      where: { email: data.email },
    });
    if (emailExists) throw new ConflictError("Email already exists");

    const phoneExists = await tx.adminUser.findUnique({
      where: { phone: data.phone },
    });
    if (phoneExists) throw new ConflictError("Phone number already exists");

    // validate departments (if any)
    if (data.department_ids?.length) {
      const deptCount = await tx.department.count({
        where: { id: { in: data.department_ids } },
      });
      if (deptCount !== data.department_ids.length) {
        throw new ConflictError("One or more departments are invalid");
      }
    }

    // validate permissions (if any, by id)
    if (data.permission_ids?.length) {
      const permCount = await tx.permission.count({
        where: { id: { in: data.permission_ids } },
      });
      if (permCount !== data.permission_ids.length) {
        throw new ValidationError("One or more permissions are invalid");
      }
    }

    const userCode = await generateUserCode(tx);

    const onboardingToken = jwt.sign(
      { sub: data.email, purpose: "user_invitation" },
      INVITE_JWT_SECRET,
      { expiresIn: INVITE_TOKEN_TTL }
    );

    const onboardingTokenHash = hashToken(onboardingToken);
    const decoded = jwt.decode(onboardingToken);
    const onboardingTokenExpiresAt = new Date(decoded.exp * 1000);

    // create user
    const user = await tx.adminUser.create({
      data: {
        user_code: userCode,
        name: data.name,
        email: data.email,
        phone: data.phone,
        alternate_phone: data.alternate_phone ?? null,

        address_line1: data.address_line1 ?? null,
        address_line2: data.address_line2 ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        pincode: data.pincode ?? null,

        date_of_joining: data.date_of_joining
          ? new Date(data.date_of_joining)
          : new Date(),

        password: null,
        status: "INACTIVE",

        admin_role: data.admin_role || "EMPLOYEE",

        onboarding_completed: false,
        onboarding_token_hash: onboardingTokenHash,
        onboarding_token_expires_at: onboardingTokenExpiresAt,
        last_invite_sent_at: new Date(),

        is_2fa_enabled: false,
        totp_secret: null,
        two_fa_verified_at: null,

        created_by,

        departments: data.department_ids?.length
          ? {
              create: data.department_ids.map((department_id) => ({
                department_id,
              })),
            }
          : undefined,
      },
    });

    // assign permissions directly to user
    if (data.permission_ids?.length) {
      await tx.adminUserPermission.createMany({
        data: data.permission_ids.map((permission_id) => ({
          admin_user_id: user.id,
          permission_id,
        })),
        skipDuplicates: true,
      });
    }

    return {
      user: {
        ...user,
        onboardingToken,
      },
    };
  });
};

/* -------------------------------------------------------------------
   UPDATE ADMIN USER  (❌ permissions NOT updated here)
------------------------------------------------------------------- */
export const updateAdminUser = async (id, data, updated_by) => {
  return prisma.$transaction(async (tx) => {
    const user = await tx.adminUser.findUnique({
      where: { id: id },
    });
    if (!user) throw new NotFoundError("User not found");
    if (user.deleted_at)
      throw new ValidationError("Cannot update deleted user");

    // forbid permission changes here
    if (data.permission_ids || data.permission_codes) {
      throw new ValidationError(
        "Permissions must be updated using the dedicated permission API"
      );
    }

    // validate role if provided
    if (data.admin_role && !ADMIN_ROLES.includes(data.admin_role)) {
      throw new ValidationError("Invalid app role");
    }

    // unique email
    if (data.email && data.email !== user.email) {
      const existingEmail = await tx.adminUser.findUnique({
        where: { email: data.email },
      });
      if (existingEmail) throw new ConflictError("Email already exists");
    }

    // unique phone
    if (data.phone && data.phone !== user.phone) {
      const existingPhone = await tx.adminUser.findUnique({
        where: { phone: data.phone },
      });
      if (existingPhone) throw new ConflictError("Phone number already exists");
    }

    // validate departments
    if (data.department_ids?.length) {
      const deptCount = await tx.department.count({
        where: { id: { in: data.department_ids } },
      });
      if (deptCount !== data.department_ids.length) {
        throw new ConflictError("One or more departments are invalid");
      }
    }

    const updatedUser = await tx.adminUser.update({
      where: { id: id },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        alternate_phone: data.alternate_phone ?? undefined,

        address_line1: data.address_line1 ?? undefined,
        address_line2: data.address_line2 ?? undefined,
        city: data.city ?? undefined,
        state: data.state ?? undefined,
        pincode: data.pincode ?? undefined,

        status: data.status,
        admin_role: data.admin_role ?? undefined,

        updated_by,

        departments: data.department_ids
          ? {
              deleteMany: {},
              create: data.department_ids.map((department_id) => ({
                department_id,
              })),
            }
          : undefined,
      },
      include: {
        departments: { include: { department: true } },
        permissions: { include: { permission: true } },
      },
    });

    return updatedUser;
  });
};

export const deleteAdminUser = async (id, deleted_by) => {
  return prisma.$transaction(async (tx) => {
    const user = await tx.adminUser.findUnique({
      where: { id: id },
    });

    if (!user) throw new NotFoundError("User not found");
    if (user.deleted_at) throw new ValidationError("User already deleted");

    // 1) revoke all direct permissions
    await tx.adminUserPermission.deleteMany({
      where: { admin_user_id: id },
    });

    // 2) soft delete the user
    const deletedUser = await tx.adminUser.update({
      where: { id: id },
      data: {
        deleted_by,
        deleted_at: new Date(),
        status: "SUSPENDED",
      },
    });

    return deletedUser;
  });
};

/* -------------------------------------------------------------------
   LIST USERS  (includes permissions)
------------------------------------------------------------------- */
export const listAdminUsers = async (filters = {}) => {
  const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
  const pageSize =
    Number(filters.page_size) > 0 ? Number(filters.page_size) : 10;

  const where = { deleted_at: null };

  if (filters.status) where.status = filters.status;

  if (filters.department_id) {
    where.departments = { some: { department_id: filters.department_id } };
  }

  if (filters.search?.trim()) {
    const s = filters.search.trim();
    where.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { email: { contains: s, mode: "insensitive" } },
      { phone: { contains: s } },
      { user_code: { contains: s, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.adminUser.findMany({
      where,
      include: {
        departments: { include: { department: true } },
        permissions: {
          include: { permission: true },
        },
      },
      orderBy: { date_of_joining: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.adminUser.count({ where }),
  ]);

  return {
    data: items,
    pagination: {
      page,
      page_size: pageSize,
      total_items: total,
      total_pages: Math.ceil(total / pageSize),
    },
  };
};

/* -------------------------------------------------------------------
   GET SINGLE USER (includes permissions)
------------------------------------------------------------------- */
export const getAdminUserById = async (id) => {
  const user = await prisma.adminUser.findFirst({
    where: { id: id, deleted_at: null },
    include: {
      departments: { include: { department: true } },
      permissions: { include: { permission: true } },
    },
  });

  if (!user) throw new NotFoundError("User not found");
  return user;
};

export const resendOnboardingInvite = async (id, resent_by) => {
  return prisma.$transaction(async (tx) => {
    const user = await tx.adminUser.findUnique({
      where: { id },
    });

    if (!user || user.deleted_at) {
      throw new NotFoundError("User not found");
    }

    if (user.onboarding_completed) {
      throw new ValidationError("User already onboarded");
    }

    if (user.status !== "INACTIVE") {
      throw new ValidationError(
        "Cannot resend invite for active/suspended user"
      );
    }

    if (user.last_invite_sent_at) {
      const diffMs = Date.now() - user.last_invite_sent_at.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      if (diffMinutes < RESEND_COOLDOWN_MINUTES) {
        throw new ValidationError(
          `Invite already sent recently. Try again after ${Math.ceil(
            RESEND_COOLDOWN_MINUTES - diffMinutes
          )} minutes`
        );
      }
    }

    const onboardingToken = crypto.randomBytes(32).toString("hex");
    const onboardingTokenHash = hashToken(onboardingToken);
    const onboardingTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await tx.adminUser.update({
      where: { id: id },
      data: {
        onboarding_token_hash: onboardingTokenHash,
        onboarding_token_expires_at: onboardingTokenExpiresAt,
        last_invite_sent_at: new Date(),
        updated_by: resent_by,
      },
    });

    return {
      email: user.email,
      name: user.name,
      onboardingToken,
    };
  });
};

export const generatePasswordResetToken = async (id, updated_by) => {
  const user = await prisma.adminUser.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      deleted_at: true,
      onboarding_completed: true,
      last_password_reset_request_at: true,
    },
  });

  // Silent fail
  if (
    !user ||
    user.deleted_at ||
    user.status !== "ACTIVE" ||
    !user.onboarding_completed
  ) {
    return null;
  }

  // Cooldown (anti-spam)
  if (user.last_password_reset_request_at) {
    const diffMs = Date.now() - user.last_password_reset_request_at.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    if (diffMinutes < PASSWORD_RESET_COOLDOWN_MINUTES) {
      return null;
    }
  }

  // Generate JWT
  const resetToken = jwt.sign(
    {
      sub: user.id,
      purpose: "password_reset",
    },
    JWT_SECRET,
    { expiresIn: INVITE_TOKEN_TTL }
  );

  const resetTokenHash = hashToken(resetToken);

  const decoded = jwt.decode(resetToken);
  if (!decoded || typeof decoded !== "object" || !decoded.exp) {
    throw new Error("Failed to generate password reset token");
  }

  const resetTokenExpiresAt = new Date(decoded.exp * 1000);

  // Persist token metadata
  await prisma.adminUser.update({
    where: { id: user.id },
    data: {
      password_reset_token_hash: resetTokenHash,
      password_reset_token_expires_at: resetTokenExpiresAt,
      last_password_reset_request_at: new Date(),
      updated_by: updated_by,
    },
  });

  return {
    email: user.email,
    name: user.name,
    resetToken,
  };
};

export const generateOnboardingResetToken = async (id, requested_by) => {
  const user = await prisma.adminUser.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      deleted_at: true,
      onboarding_completed: true,
      last_onboarding_reset_request_at: true,
    },
  });

  // Silent fail
  if (
    !user ||
    user.deleted_at ||
    user.status !== "ACTIVE" ||
    !user.onboarding_completed
  ) {
    return null;
  }

  // Cooldown enforcement
  if (user.last_onboarding_reset_request_at) {
    const diffMs = Date.now() - user.last_onboarding_reset_request_at.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    if (diffMinutes < ONBOARDING_RESET_COOLDOWN_MINUTES) {
      return null;
    }
  }

  // Generate JWT
  const resetToken = jwt.sign(
    {
      sub: user.id,
      purpose: "onboarding_reset",
    },
    JWT_SECRET,
    { expiresIn: INVITE_TOKEN_TTL }
  );

  const resetTokenHash = hashToken(resetToken);

  const decoded = jwt.decode(resetToken);
  if (!decoded || typeof decoded !== "object" || !decoded.exp) {
    throw new Error("Failed to generate onboarding reset token");
  }

  const resetTokenExpiresAt = new Date(decoded.exp * 1000);

  // Persist reset state
  await prisma.adminUser.update({
    where: { id: user.id },
    data: {
      onboarding_reset_token_hash: resetTokenHash,
      onboarding_reset_token_expires_at: resetTokenExpiresAt,
      last_onboarding_reset_request_at: new Date(),
      onboarding_reset_requested_by: requested_by,

      // reset onboarding-related state
      onboarding_completed: false,
      is_2fa_enabled: false,
      totp_secret: null,
      two_fa_verified_at: null,

      updated_by: requested_by,
    },
  });

  return {
    email: user.email,
    name: user.name,
    resetToken,
  };
};
