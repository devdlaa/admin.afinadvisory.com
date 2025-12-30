import { PrismaClient } from "@prisma/client";
import {
  NotFoundError,
  ConflictError
} from "../../utils/server/errors.js";

const prisma = new PrismaClient();

export const createEntityRegistration = async (data, admin_id) => {
  return prisma.$transaction(async (tx) => {
    // entity exists
    const entity = await tx.entity.findFirst({
      where: { id: data.entity_id, deleted_at: null },
    });

    if (!entity) {
      throw new NotFoundError("Entity not found");
    }

    // primary handling (structural)
    if (data.is_primary === true) {
      await tx.entityRegistration.updateMany({
        where: {
          entity_id: data.entity_id,
          registration_type_id: data.registration_type_id,
          is_primary: true,
          deleted_at: null,
        },
        data: { is_primary: false },
      });
    }

    try {
      return await tx.entityRegistration.create({
        data: {
          entity_id: data.entity_id,
          registration_type_id: data.registration_type_id,
          registration_number: data.registration_number,
          state: data.state,
          effective_from: data.effective_from,
          effective_to: data.effective_to ?? null,
          status: data.status,
          is_primary: data.is_primary ?? false,
          created_by: admin_id,
        },
      });
    } catch (err) {
      if (err.code === "P2002") {
        throw new ConflictError(
          "Registration already exists for this entity and type"
        );
      }

      if (err.code === "P2003") {
        throw new NotFoundError("Invalid registration type or entity");
      }

      throw err;
    }
  });
};

export const updateEntityRegistration = async (id, data, admin_id) => {
  return prisma.$transaction(async (tx) => {
    const registration = await tx.entityRegistration.findFirst({
      where: { id, deleted_at: null },
    });

    if (!registration) {
      throw new NotFoundError("Entity registration not found");
    }

    if (data.is_primary === true) {
      await tx.entityRegistration.updateMany({
        where: {
          entity_id: registration.entity_id,
          registration_type_id: registration.registration_type_id,
          is_primary: true,
          deleted_at: null,
        },
        data: { is_primary: false },
      });
    }

    return tx.entityRegistration.update({
      where: { id },
      data: {
        registration_number: data.registration_number ?? undefined,
        state: data.state ?? undefined,
        effective_from: data.effective_from ?? undefined,
        effective_to: data.effective_to ?? undefined,
        status: data.status ?? undefined,
        is_primary: data.is_primary ?? undefined,
        updated_by: admin_id,
      },
    });
  });
};

export const deleteEntityRegistration = async (id, admin_id) => {
  return prisma.$transaction(async (tx) => {
    const registration = await tx.entityRegistration.findFirst({
      where: { id, deleted_at: null },
    });

    if (!registration) {
      throw new NotFoundError("Entity registration not found");
    }

    // // ✅ NEW GUARD: Check for active settings before deleting
    // const activeSettings = await tx.entityRegistrationSetting.count({
    //   where: {
    //     entity_registration_id: id,
    //     deleted_at: null,
    //   },
    // });

    // if (activeSettings > 0) {
    //   throw new ValidationError(
    //     "Cannot delete entity registration with active compliance settings. Delete settings first."
    //   );
    // }

    return tx.entityRegistration.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: admin_id,
        status: "INACTIVE",
        is_primary: false,
      },
    });
  });
};

export const listEntityRegistrations = async (entity_id) => {
  const entity = await prisma.entity.findFirst({
    where: { id: entity_id, deleted_at: null },
  });

  if (!entity) {
    throw new NotFoundError("Entity not found");
  }

  // straight fetch, no pagination or fancy filters
  const registrations = await prisma.entityRegistration.findMany({
    where: {
      entity_id,
      deleted_at: null,
    },
    include: {
      registrationType: true,
    },
    orderBy: [
      { is_primary: "desc" },
      { effective_from: "desc" },
      { created_at: "desc" },
    ],
  });

  return {
    entity_id,
    count: registrations.length,
    registrations,
  };
};
