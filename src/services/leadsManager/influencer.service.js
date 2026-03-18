import { prisma } from "@/utils/server/db";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/utils/server/errors";

export async function createInfluencer(data, admin_user_id) {
  const { social_links = [], ...rest } = data;

  const existing = await prisma.influencer.findFirst({
    where: {
      deleted_at: null,
      OR: [{ email: rest.email }, { phone: rest.phone }],
    },
    select: {
      email: true,
      phone: true,
    },
  });

  if (existing) {
    if (existing.email === rest.email) {
      throw new ValidationError("Influencer with this email already exists");
    }

    if (existing.phone === rest.phone) {
      throw new ValidationError("Influencer with this phone already exists");
    }
  }

  const influencer = await prisma.$transaction(async (tx) => {
    const created = await tx.influencer.create({
      data: {
        ...rest,
        created_by: admin_user_id,
        updated_by: admin_user_id,
      },
    });

    if (social_links.length > 0) {
      await tx.influencerSocialLink.createMany({
        data: social_links.map((link) => ({
          influencer_id: created.id,
          platform: link.platform,
          url: link.url,
        })),
      });
    }

    return tx.influencer.findUnique({
      where: { id: created.id },
      include: {
        social_links: {
          orderBy: { created_at: "asc" },
        },
      },
    });
  });

  return influencer;
}

export async function updateInfluencer(id, data, admin_user_id) {
  const influencer = await prisma.influencer.findFirst({
    where: {
      id,
      deleted_at: null,
    },
    include: {
      social_links: true,
    },
  });

  if (!influencer) {
    throw new NotFoundError("Influencer not found");
  }

  const { social_links, ...rest } = data;

  if (rest.email || rest.phone) {
    const existing = await prisma.influencer.findFirst({
      where: {
        deleted_at: null,
        id: { not: id },
        OR: [
          rest.email ? { email: rest.email } : undefined,
          rest.phone ? { phone: rest.phone } : undefined,
        ].filter(Boolean),
      },
      select: {
        email: true,
        phone: true,
      },
    });

    if (existing) {
      if (rest.email && existing.email === rest.email) {
        throw new ValidationError("Influencer with this email already exists");
      }

      if (rest.phone && existing.phone === rest.phone) {
        throw new ValidationError("Influencer with this phone already exists");
      }
    }
  }

  return prisma.$transaction(async (tx) => {
    if (Object.keys(rest).length > 0) {
      await tx.influencer.update({
        where: { id },
        data: {
          ...rest,
          updated_by: admin_user_id,
        },
      });
    }

    if (social_links) {
      const existingLinks = influencer.social_links;

      const existingMap = new Map(
        existingLinks.map((l) => [l.url.toLowerCase(), l]),
      );

      const incomingMap = new Map(
        social_links.map((l) => [l.url.toLowerCase(), l]),
      );

      const toDelete = existingLinks.filter(
        (l) => !incomingMap.has(l.url.toLowerCase()),
      );

      const toCreate = social_links.filter(
        (l) => !existingMap.has(l.url.toLowerCase()),
      );

      if (toDelete.length > 0) {
        await tx.influencerSocialLink.deleteMany({
          where: {
            id: { in: toDelete.map((l) => l.id) },
          },
        });
      }

      if (toCreate.length > 0) {
        await tx.influencerSocialLink.createMany({
          data: toCreate.map((l) => ({
            influencer_id: id,
            platform: l.platform,
            url: l.url,
          })),
        });
      }
    }

    return tx.influencer.findUnique({
      where: { id },
      include: {
        social_links: {
          orderBy: { created_at: "asc" },
        },
      },
    });
  });
}

export async function deleteInfluencer(id, admin_user_id) {
  const influencer = await prisma.influencer.findFirst({
    where: {
      id,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!influencer) {
    throw new NotFoundError("Influencer not found");
  }

  const reference = await prisma.leadReference.findFirst({
    where: {
      influencer_id: id,
    },
    select: { id: true },
  });

  if (reference) {
    throw new ValidationError(
      "Influencer cannot be deleted because it is used in a lead",
    );
  }

  await prisma.influencer.update({
    where: { id },
    data: {
      deleted_at: new Date(),
      deleted_by: admin_user_id,
      updated_by: admin_user_id,
    },
  });

  return { id };
}

export async function getInfluencerById(id, admin_user_id) {
  const influencer = await prisma.influencer.findFirst({
    where: {
      id,
      deleted_at: null,
    },
    include: {
      social_links: {
        orderBy: { created_at: "asc" },
      },
    },
  });

  if (!influencer) {
    throw new NotFoundError("Influencer not found");
  }

  return influencer;
}

export async function listInfluencers(filters, admin_user_id) {
  const { page = 1, page_size = 20, search } = filters;

  const skip = (page - 1) * page_size;

  const where = {
    deleted_at: null,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, influencers] = await prisma.$transaction([
    prisma.influencer.count({ where }),
    prisma.influencer.findMany({
      where,
      skip,
      take: page_size,
      orderBy: { created_at: "desc" },
      include: {
        social_links: {
          orderBy: { created_at: "asc" },
        },
      },
    }),
  ]);

  return {
    data: influencers,
    pagination: {
      total,
      page,
      per_page: page_size,
      has_more: page * page_size < total,
    },
  };
}
