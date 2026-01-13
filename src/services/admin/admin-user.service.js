import { prisma } from "@/utils/server/db.js";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

import crypto from "crypto";
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../../utils/server/errors.js";

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_ADMIN_SECRET;
const INVITE_TOKEN_TTL = "24h";
const RESEND_COOLDOWN_MINUTES = 15;
const PASSWORD_RESET_COOLDOWN_MINUTES = 15;
const ONBOARDING_RESET_COOLDOWN_MINUTES = 15;

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const generateUserCode = async (tx) => {
  const counter = await tx.adminUserCounter.upsert({
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

export const sanitizeAdminUser = (user) => {
  if (!user) return null;

  const {
    password,
    totp_secret,
    onboarding_token_hash,
    password_reset_token_hash,
    onboarding_reset_token_hash,
    onboarding_token_expires_at,
    last_password_reset_request_at,
    password_reset_token_expires_at,
    last_onboarding_reset_request_at,
    onboarding_reset_token_expires_at,
    two_fa_verified_at,
    auth_provider,
    provider_id,
    created_by,
    updated_by,
    deleted_by,
    deleted_at,
    ...safe
  } = user;

  return safe;
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

    // uniqueness checks
    const emailExists = await tx.adminUser.findUnique({
      where: { email: data.email },
    });
    if (emailExists) throw new ConflictError("Email already exists");

    const phoneExists = await tx.adminUser.findUnique({
      where: { phone: data.phone },
    });
    if (phoneExists) throw new ConflictError("Phone number already exists");

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

    // 1) create user first so we have UUID
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

        password: null,
        status: "INACTIVE",

        admin_role: data.admin_role || "ADMIN",

        onboarding_completed: false,
        onboarding_token_hash: null,
        onboarding_token_expires_at: null,
        last_invite_sent_at: null,

        is_2fa_enabled: false,
        totp_secret: null,
        two_fa_verified_at: null,

        created_by,
      },
    });

    // 2) sign token including UUID
    const onboardingToken = jwt.sign(
      {
        sub: user.id, // UUID now in payload
        email: user.email,
        purpose: "user_invitation",
      },
      JWT_SECRET,
      { expiresIn: INVITE_TOKEN_TTL }
    );

    // 3) derive hash and expiry
    const onboardingTokenHash = hashToken(onboardingToken);
    const decoded = jwt.decode(onboardingToken);
    const onboardingTokenExpiresAt = new Date(decoded.exp * 1000);

    // 4) update user with onboarding info
    await tx.adminUser.update({
      where: { id: user.id },
      data: {
        onboarding_token_hash: onboardingTokenHash,
        onboarding_token_expires_at: onboardingTokenExpiresAt,
        last_invite_sent_at: new Date(),
      },
    });

    // 5) assign permissions if present
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
      user: sanitizeAdminUser(user),
      onboardingToken,
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
      },
      include: {
        permissions: { include: { permission: true } },
      },
    });

    return sanitizeAdminUser(updatedUser);
  });
};

export const deleteAdminUser = async (id, deleted_by) => {
  return prisma.$transaction(async (tx) => {
    // 1️⃣ Fetch the user to be deleted
    const userToDelete = await tx.adminUser.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        admin_role: true,
        status: true,
        deleted_at: true,
        created_by: true,
      },
    });

    if (!userToDelete) {
      throw new NotFoundError("User not found");
    }

    if (userToDelete.deleted_at) {
      throw new ValidationError("User already deleted");
    }

    // 2️⃣ Fetch the user performing the deletion
    const deletingUser = await tx.adminUser.findUnique({
      where: { id: deleted_by },
      select: {
        id: true,
        admin_role: true,
        status: true,
        deleted_at: true,
      },
    });

    if (!deletingUser) {
      throw new ConflictError("Invalid session");
    }

    if (deletingUser.deleted_at || deletingUser.status !== "ACTIVE") {
      throw new ConflictError("Your account is not active");
    }

    // 3️⃣ CRITICAL: Prevent self-deletion
    if (userToDelete.id === deleted_by) {
      throw new ConflictError(
        "You cannot delete your own account. Please contact another administrator."
      );
    }

    // 5️⃣ CRITICAL: Prevent deletion of last SUPER_ADMIN
    if (userToDelete.admin_role === "SUPER_ADMIN") {
      const superAdminCount = await tx.adminUser.count({
        where: {
          admin_role: "SUPER_ADMIN",
          deleted_at: null,
          status: "ACTIVE",
        },
      });

      if (superAdminCount <= 1) {
        throw new ConflictError(
          "Cannot delete the last SUPER_ADMIN. At least one SUPER_ADMIN must exist in the system."
        );
      }
    }

    // 6️⃣ Optional: Check if deleting user created this user (ownership validation)

    if (
      userToDelete.created_by !== deleted_by &&
      deletingUser.admin_role !== "SUPER_ADMIN"
    ) {
      throw new ConflictError(
        "You can only delete users you created, unless you are a SUPER_ADMIN."
      );
    }

    // 7️⃣ Revoke all direct permissions
    await tx.adminUserPermission.deleteMany({
      where: { admin_user_id: id },
    });

    const deletedUser = await tx.adminUser.delete({
      where: { id },
    });

    return sanitizeAdminUser(deletedUser);
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
    data: items.map(sanitizeAdminUser),
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
  return sanitizeAdminUser(user);
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

  // Cooldown
  if (user.last_password_reset_request_at) {
    const diffMs = Date.now() - user.last_password_reset_request_at.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    if (diffMinutes < PASSWORD_RESET_COOLDOWN_MINUTES) {
      return null;
    }
  }

  // JWT with id + email + purpose
  const resetToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      purpose: "password_reset",
    },
    JWT_SECRET,
    { expiresIn: INVITE_TOKEN_TTL }
  );

  // Store only hash
  const resetTokenHash = hashToken(resetToken);

  const decoded = jwt.decode(resetToken);
  if (!decoded || typeof decoded !== "object" || !decoded.exp) {
    throw new Error("Failed to generate password reset token");
  }

  const resetTokenExpiresAt = new Date(decoded.exp * 1000);

  await prisma.adminUser.update({
    where: { id: user.id },
    data: {
      password_reset_token_hash: resetTokenHash,
      password_reset_token_expires_at: resetTokenExpiresAt,
      last_password_reset_request_at: new Date(),
      updated_by,
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

  // JWT with id + email + purpose
  const resetToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
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

  await prisma.adminUser.update({
    where: { id: user.id },
    data: {
      status: "INACTIVE",
      last_onboarding_reset_request_at: new Date(),
      onboarding_token_hash: resetTokenHash,
      onboarding_token_expires_at: resetTokenExpiresAt,

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

export async function toggleAdminUserActiveStatus({
  targetUserId,
  actingUserId,
}) {
  const [target, actor] = await Promise.all([
    prisma.adminUser.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        status: true,
        deleted_at: true,
        onboarding_completed: true,
        admin_role: true,
      },
    }),
    prisma.adminUser.findUnique({
      where: { id: actingUserId },
      select: {
        id: true,
        status: true,
        deleted_at: true,
        admin_role: true,
      },
    }),
  ]);

  if (!target) throw new NotFoundError("User not found");
  if (!actor) throw new ForbiddenError("Invalid session");

  // actor must be active
  if (actor.deleted_at || actor.status !== "ACTIVE") {
    throw new ForbiddenError("Your account is not active");
  }

  // cannot toggle yourself
  if (target.id === actor.id) {
    throw new ForbiddenError("You cannot change your own account status");
  }

  // cannot toggle deleted users
  if (target.deleted_at) {
    throw new ValidationError("Target user is deleted");
  }

  // decide new status
  let newStatus;

  if (target.status === "ACTIVE") {
    newStatus = "INACTIVE";
  } else if (target.status === "INACTIVE") {
    if (!target.onboarding_completed) {
      throw new ValidationError(
        "User cannot be activated before completing onboarding"
      );
    }
    newStatus = "ACTIVE";
  } else {
    throw new ValidationError("Only ACTIVE/INACTIVE accounts can be toggled");
  }

  const updated = await prisma.adminUser.update({
    where: { id: targetUserId },
    data: {
      status: newStatus,
      updated_by: actingUserId,
    },
  });

  return sanitizeAdminUser(updated);
}

export async function getAllSuperAdminIds() {
  const users = await prisma.adminUser.findMany({
    where: {
      admin_role: "SUPER_ADMIN",
      deleted_at: null,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  return users.map((u) => u.id);
}
