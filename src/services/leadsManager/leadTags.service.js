import { prisma } from "@/utils/server/db";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/utils/server/errors";

/* ------------------------------------------------ */
/* TAGS */
/* ------------------------------------------------ */

import { REMINDER_TAG_COLORS } from "../reminders/reminder.constants";

const normalizeForDuplicateCheck = (name) => {
  return name.trim().toUpperCase().replace(/\s+/g, " ");
};

const formatTagResponse = (tag) => ({
  id: tag.id,
  name: tag.name,
  color: tag.color,
  color_code: REMINDER_TAG_COLORS[tag.color],
});

const toTitleCase = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

/* ------------------------------------------------ */
/* CREATE */
/* ------------------------------------------------ */

export const createLeadTag = async (input, currentUser) => {
  return prisma.$transaction(async (tx) => {
    if (!input.name || !input.name.trim()) {
      throw new ValidationError("Tag name is required");
    }

    const user = await tx.adminUser.findUnique({
      where: { id: currentUser.id },
      select: { id: true, status: true, deleted_at: true },
    });

    if (!user || user.deleted_at || user.status !== "ACTIVE") {
      throw new NotFoundError("User not found or inactive");
    }

    const formattedName = toTitleCase(input.name);

    if (!/^[A-Za-z0-9 _\-\/]+$/.test(formattedName)) {
      throw new ValidationError(
        "Tag name can only contain letters, numbers, spaces, hyphens, underscores, and slashes",
      );
    }

    if (formattedName.length > 50) {
      throw new ValidationError("Tag name cannot exceed 50 characters");
    }

    const normalizedName = normalizeForDuplicateCheck(formattedName);

    const colorKey = (input.color || "").toUpperCase();

    if (!REMINDER_TAG_COLORS[colorKey]) {
      throw new ValidationError("Invalid tag color selected");
    }

    try {
      const tag = await tx.leadTag.create({
        data: {
          name: formattedName,
          normalized_name: normalizedName,
          color: colorKey,
          created_by: currentUser.id,
        },
      });

      return {
        tag: formatTagResponse(tag),
      };
    } catch (error) {
      if (error.code === "P2002") {
        throw new ConflictError("A tag with this name already exists");
      }
      throw error;
    }
  });
};

/* ------------------------------------------------ */
/* UPDATE */
/* ------------------------------------------------ */

export const updateLeadTag = async (tagId, input, currentUser) => {
  return prisma.$transaction(async (tx) => {
    if (!tagId) {
      throw new ValidationError("Tag ID is required");
    }

    const user = await tx.adminUser.findUnique({
      where: { id: currentUser.id },
      select: { id: true, status: true, deleted_at: true },
    });

    if (!user || user.deleted_at || user.status !== "ACTIVE") {
      throw new NotFoundError("User not found or inactive");
    }

    const tag = await tx.leadTag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      throw new NotFoundError("Tag not found");
    }

    let formattedName = tag.name;
    let normalizedName = tag.normalized_name;

    if (input.name !== undefined) {
      if (!input.name.trim()) {
        throw new ValidationError("Tag name cannot be empty");
      }

      formattedName = toTitleCase(input.name);

      if (!/^[A-Za-z0-9 _\-\/]+$/.test(formattedName)) {
        throw new ValidationError(
          "Tag name can only contain letters, numbers, spaces, hyphens, underscores, and slashes",
        );
      }

      if (formattedName.length > 50) {
        throw new ValidationError("Tag name cannot exceed 50 characters");
      }

      normalizedName = normalizeForDuplicateCheck(formattedName);
    }

    let colorKey = tag.color;

    if (input.color !== undefined) {
      colorKey = input.color.toUpperCase();

      if (!REMINDER_TAG_COLORS[colorKey]) {
        throw new ValidationError("Invalid tag color selected");
      }
    }

    try {
      const updatedTag = await tx.leadTag.update({
        where: { id: tagId },
        data: {
          name: formattedName,
          normalized_name: normalizedName,
          color: colorKey,
          updated_by: currentUser.id,
        },
      });

      return {
        tag: formatTagResponse(updatedTag),
      };
    } catch (error) {
      if (error.code === "P2002") {
        throw new ConflictError("A tag with this name already exists");
      }

      throw error;
    }
  });
};

/* ------------------------------------------------ */
/* DELETE */
/* ------------------------------------------------ */

export const deleteLeadTag = async (tagId, currentUser) => {
  return prisma.$transaction(async (tx) => {
    if (!tagId) {
      throw new ValidationError("Tag ID is required");
    }

    const user = await tx.adminUser.findUnique({
      where: { id: currentUser.id },
      select: { id: true, status: true, deleted_at: true },
    });

    if (!user || user.deleted_at || user.status !== "ACTIVE") {
      throw new NotFoundError("User not found or inactive");
    }

    const tag = await tx.leadTag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      throw new NotFoundError("Tag not found");
    }

    const usage = await tx.leadTagMap.count({
      where: { tag_id: tagId },
    });

    if (usage > 0) {
      throw new ForbiddenError("Tag is used by leads and cannot be deleted");
    }

    await tx.leadTag.update({
      where: { id: tagId },
      data: {
        deleted_at: new Date(),
        deleted_by: currentUser.id,
      },
    });

    return {
      tagID: tagId,
      success: true,
      message: "Tag deleted successfully",
    };
  });
};

/* ------------------------------------------------ */
/* LIST */
/* ------------------------------------------------ */

export const listLeadTags = async (input, currentUser) => {
  const { cursor, limit = 20, search } = input || {};

  const user = await prisma.adminUser.findUnique({
    where: { id: currentUser.id },
    select: { id: true, status: true, deleted_at: true },
  });

  if (!user || user.deleted_at || user.status !== "ACTIVE") {
    throw new NotFoundError("User not found or inactive");
  }

  const where = {
    deleted_at: null,
  };

  if (search && search.trim()) {
    const normalizedSearch = search.trim().toUpperCase().replace(/\s+/g, " ");

    where.normalized_name = {
      contains: normalizedSearch,
    };
  }

  const tags = await prisma.leadTag.findMany({
    where,
    orderBy: { id: "asc" },
    take: limit + 1,
    ...(cursor && {
      skip: 1,
      cursor: { id: cursor },
    }),
  });

  let nextCursor = null;

  if (tags.length > limit) {
    const nextItem = tags.pop();
    nextCursor = nextItem.id;
  }

  return {
    tags: tags.map(formatTagResponse),
    next_cursor: nextCursor,
  };
};
