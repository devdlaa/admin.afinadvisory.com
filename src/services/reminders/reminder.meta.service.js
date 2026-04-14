import { prisma } from "@/utils/server/db";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from "@/utils/server/errors";

/* ------------------------------------------------ */
/* TAGS */
/* ------------------------------------------------ */

import { REMINDER_LIST_ICONS, REMINDER_TAG_COLORS } from "./reminder.constants";

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

export const createReminderTag = async (input, currentUser) => {
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

    const normalizedName = normalizeForDuplicateCheck(formattedName);

    const colorKey = (input.color || "").toUpperCase();

    if (!REMINDER_TAG_COLORS[colorKey]) {
      throw new ValidationError("Invalid tag color selected");
    }

    try {
      const tag = await tx.reminderTag.create({
        data: {
          user_id: currentUser.id,
          name: formattedName,
          normalized_name: normalizedName,
          color: colorKey,
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

export const updateReminderTag = async (tagId, input, currentUser) => {
  return prisma.$transaction(async (tx) => {
    if (!tagId) {
      throw new ValidationError("Tag ID is required");
    }

    const user = await tx.adminUser.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        status: true,
        deleted_at: true,
      },
    });

    if (!user || user.deleted_at || user.status !== "ACTIVE") {
      throw new NotFoundError("User not found or inactive");
    }

    const tag = await tx.reminderTag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      throw new NotFoundError("Tag not found");
    }

    if (tag.user_id !== currentUser.id) {
      throw new ForbiddenError("You cannot update this tag");
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
      const updatedTag = await tx.reminderTag.update({
        where: { id: tagId },
        data: {
          name: formattedName,
          normalized_name: normalizedName,
          color: colorKey,
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

export const deleteReminderTag = async (tagId, currentUser) => {
  return prisma.$transaction(async (tx) => {
    if (!tagId) {
      throw new ValidationError("Tag ID is required");
    }

    const user = await tx.adminUser.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        status: true,
        deleted_at: true,
      },
    });

    if (!user || user.deleted_at || user.status !== "ACTIVE") {
      throw new NotFoundError("User not found or inactive");
    }

    const tag = await tx.reminderTag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      throw new NotFoundError("Tag not found");
    }

    if (tag.user_id !== currentUser.id) {
      throw new ForbiddenError("You cannot delete this tag");
    }

    const usage = await tx.reminderTagMap.count({
      where: { tag_id: tagId },
    });

    if (usage > 0) {
      throw new ForbiddenError(
        "Tag is used by reminders and cannot be deleted",
      );
    }

    await tx.reminderTag.delete({
      where: { id: tagId },
    });

    return {
      tagID: tagId,
      success: true,
      message: "Tag deleted successfully",
    };
  });
};

export const listReminderTags = async (currentUser) => {
  const user = await prisma.adminUser.findUnique({
    where: { id: currentUser.id },
    select: { id: true, status: true, deleted_at: true },
  });

  if (!user || user.deleted_at || user.status !== "ACTIVE") {
    throw new NotFoundError("User not found or inactive");
  }

  const tags = await prisma.reminderTag.findMany({
    where: { user_id: currentUser.id },
    orderBy: { name: "asc" },
  });

  return {
    tags: tags.map(formatTagResponse),
  };
};

/* ------------------------------------------------ */
/* BUCKETS */
/* ------------------------------------------------ */

const formatBucketResponse = (bucket) => {
  const iconMeta = REMINDER_LIST_ICONS[bucket.icon];

  return {
    id: bucket.id,
    name: bucket.name,

    icon: bucket.icon,
    icon_name: iconMeta.icon,

    icon_bg: iconMeta.bg,
    icon_stroke: iconMeta.stroke,
  };
};

export const createReminderBucket = async (input, currentUser) => {
  return prisma.$transaction(async (tx) => {
    if (!input.name || !input.name.trim()) {
      throw new ValidationError("List name is required");
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
        "List name can only contain letters, numbers, spaces, hyphens, underscores, and slashes",
      );
    }

    if (formattedName.length > 50) {
      throw new ValidationError("List name cannot exceed 50 characters");
    }

    const normalizedName = normalizeForDuplicateCheck(formattedName);

    const iconKey = (input.icon || "HASH").toUpperCase();

    if (!REMINDER_LIST_ICONS[iconKey]) {
      throw new ValidationError("Invalid icon selected");
    }

    try {
      const bucket = await tx.reminderBucket.create({
        data: {
          user_id: currentUser.id,
          name: formattedName,
          normalized_name: normalizedName,
          icon: iconKey,
        },
      });

      return {
        list: formatBucketResponse(bucket),
      };
    } catch (error) {
      if (error.code === "P2002") {
        throw new ConflictError("A list with this name already exists");
      }
      throw error;
    }
  });
};

export const updateReminderBucket = async (bucketId, input, currentUser) => {
  return prisma.$transaction(async (tx) => {
    if (!bucketId) {
      throw new ValidationError("List ID is required");
    }

    const user = await tx.adminUser.findUnique({
      where: { id: currentUser.id },
      select: { id: true, status: true, deleted_at: true },
    });

    if (!user || user.deleted_at || user.status !== "ACTIVE") {
      throw new NotFoundError("User not found or inactive");
    }

    const bucket = await tx.reminderBucket.findUnique({
      where: { id: bucketId },
    });

    if (!bucket) {
      throw new NotFoundError("List not found");
    }

    if (bucket.user_id !== currentUser.id) {
      throw new ForbiddenError("You cannot update this list");
    }

    let formattedName = bucket.name;
    let normalizedName = bucket.normalized_name;

    if (input.name !== undefined) {
      if (!input.name.trim()) {
        throw new ValidationError("List name cannot be empty");
      }

      formattedName = toTitleCase(input.name);

      if (!/^[A-Za-z0-9 _\-\/]+$/.test(formattedName)) {
        throw new ValidationError(
          "List name can only contain letters, numbers, spaces, hyphens, underscores, and slashes",
        );
      }

      if (formattedName.length > 50) {
        throw new ValidationError("List name cannot exceed 50 characters");
      }

      normalizedName = normalizeForDuplicateCheck(formattedName);
    }

    let iconKey = bucket.icon;

    if (input.icon !== undefined) {
      iconKey = input.icon.toUpperCase();

      if (!REMINDER_LIST_ICONS[iconKey]) {
        throw new ValidationError("Invalid icon selected");
      }
    }

    try {
      const updatedBucket = await tx.reminderBucket.update({
        where: { id: bucketId },
        data: {
          name: formattedName,
          normalized_name: normalizedName,
          icon: iconKey,
        },
      });

      return {
        list: formatBucketResponse(updatedBucket),
      };
    } catch (error) {
      if (error.code === "P2002") {
        throw new ConflictError("A list with this name already exists");
      }

      throw error;
    }
  });
};

export const deleteReminderBucket = async (bucketId, currentUser) => {
  return prisma.$transaction(async (tx) => {
    if (!bucketId) {
      throw new ValidationError("List ID is required");
    }

    const user = await tx.adminUser.findUnique({
      where: { id: currentUser.id },
      select: { id: true, status: true, deleted_at: true },
    });

    if (!user || user.deleted_at || user.status !== "ACTIVE") {
      throw new NotFoundError("User not found or inactive");
    }

    const bucket = await tx.reminderBucket.findUnique({
      where: { id: bucketId },
    });

    if (!bucket) {
      throw new NotFoundError("List not found");
    }

    if (bucket.user_id !== currentUser.id) {
      throw new ForbiddenError("You cannot delete this list");
    }

    const usage = await tx.reminder.count({
      where: {
        bucket_id: bucketId,
        deleted_at: null,
      },
    });

    if (usage > 0) {
      throw new ForbiddenError("List contains reminders and cannot be deleted");
    }

    await tx.reminderBucket.delete({
      where: { id: bucketId },
    });

    return {
      list_id: bucketId,
      success: true,
      message: "List deleted successfully",
    };
  });
};

export const listReminderBuckets = async (currentUser, options = {}) => {
  const { all = false } = options;

  const user = await prisma.adminUser.findUnique({
    where: { id: currentUser.id },
    select: { id: true, status: true, deleted_at: true },
  });

  if (!user || user.deleted_at || user.status !== "ACTIVE") {
    throw new NotFoundError("User not found or inactive");
  }

  if (all) {
    const buckets = await prisma.reminderBucket.findMany({
      where: { user_id: currentUser.id },
      orderBy: { created_at: "asc" },
    });

    return {
      lists: buckets.map(formatBucketResponse),
    };
  }

  const buckets = await prisma.reminderBucket.findMany({
    where: { user_id: currentUser.id },
    include: {
      _count: {
        select: {
          reminders: true,
        },
      },
    },
    orderBy: {
      reminders: {
        _count: "desc",
      },
    },
    take: 10,
  });

  return {
    lists: buckets.map((bucket) => ({
      ...formatBucketResponse(bucket),
      reminder_count: bucket._count.reminders,
    })),
  };
};
