import { prisma } from "@/utils/server/db";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "@/utils/server/errors";

export async function createLeadContact(data, admin_user_id) {
  const { social_links = [], ...rest } = data;

  if (
    !rest.primary_email &&
    !rest.primary_phone &&
    !rest.secondary_email &&
    !rest.secondary_phone
  ) {
    throw new ValidationError(
      "At least one email or phone number must be provided",
    );
  }

  const duplicate = await prisma.leadContact.findFirst({
    where: {
      OR: [
        rest.primary_email ? { primary_email: rest.primary_email } : undefined,
        rest.secondary_email
          ? { secondary_email: rest.secondary_email }
          : undefined,
        rest.primary_phone ? { primary_phone: rest.primary_phone } : undefined,
        rest.secondary_phone
          ? { secondary_phone: rest.secondary_phone }
          : undefined,
        rest.pan ? { pan: rest.pan } : undefined,
        rest.gst_number ? { gst_number: rest.gst_number } : undefined,
      ].filter(Boolean),
    },
    select: {
      id: true,
      primary_email: true,
      primary_phone: true,
      pan: true,
      gst_number: true,
    },
  });

  if (duplicate && duplicate.deleted_at !== null) {
    duplicate = await prisma.leadContact.update({
      where: { id: duplicate.id },
      data: {
        deleted_at: null,
        updated_by: admin_user_id,
        ...rest,
      },
    });

    return duplicate;
  }

  if (duplicate) {
    throw new ValidationError(
      "Lead contact with same email, phone, PAN or GST already exists",
    );
  }

  const contact = await prisma.$transaction(async (tx) => {
    const created = await tx.leadContact.create({
      data: {
        ...rest,
        created_by: admin_user_id,
        updated_by: admin_user_id,
      },
    });

    if (social_links.length > 0) {
      await tx.leadContactSocialLink.createMany({
        data: social_links.map((link) => ({
          contact_id: created.id,
          platform: link.platform,
          url: link.url,
        })),
      });
    }

    return tx.leadContact.findUnique({
      where: { id: created.id },
      include: {
        creator: {
          select: { id: true, name: true },
        },
        updater: {
          select: { id: true, name: true },
        },
        social_links: {
          orderBy: { created_at: "asc" },
        },
      },
    });
  });

  return contact;
}

export async function updateLeadContact(id, data, admin_user_id) {
  const { social_links, ...rest } = data;

  const contact = await prisma.leadContact.findFirst({
    where: {
      id,
      deleted_at: null,
    },
    include: {
      creator: {
        select: { id: true, name: true },
      },
      updater: {
        select: { id: true, name: true },
      },
      social_links: true,
    },
  });

  if (!contact) {
    throw new NotFoundError("Lead contact not found");
  }

  if (
    rest.primary_email ||
    rest.secondary_email ||
    rest.primary_phone ||
    rest.secondary_phone ||
    rest.pan ||
    rest.gst_number
  ) {
    const duplicate = await prisma.leadContact.findFirst({
      where: {
        id: { not: id },
        deleted_at: null,
        OR: [
          rest.primary_email
            ? { primary_email: rest.primary_email }
            : undefined,
          rest.secondary_email
            ? { secondary_email: rest.secondary_email }
            : undefined,
          rest.primary_phone
            ? { primary_phone: rest.primary_phone }
            : undefined,
          rest.secondary_phone
            ? { secondary_phone: rest.secondary_phone }
            : undefined,
          rest.pan ? { pan: rest.pan } : undefined,
          rest.gst_number ? { gst_number: rest.gst_number } : undefined,
        ].filter(Boolean),
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ValidationError(
        "Lead contact with same email, phone, PAN or GST already exists",
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    if (Object.keys(rest).length > 0) {
      await tx.leadContact.update({
        where: { id },
        data: {
          ...rest,
          updated_by: admin_user_id,
        },
      });
    }

    if (social_links) {
      const existingLinks = contact.social_links;

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
        await tx.leadContactSocialLink.deleteMany({
          where: {
            id: { in: toDelete.map((l) => l.id) },
          },
        });
      }

      if (toCreate.length > 0) {
        await tx.leadContactSocialLink.createMany({
          data: toCreate.map((l) => ({
            contact_id: id,
            platform: l.platform,
            url: l.url,
          })),
        });
      }
    }

    return tx.leadContact.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true },
        },
        updater: {
          select: { id: true, name: true },
        },
        social_links: {
          orderBy: { created_at: "asc" },
        },
      },
    });
  });
}

export async function deleteLeadContact(id, admin_user_id) {
  const contact = await prisma.leadContact.findFirst({
    where: {
      id,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!contact) {
    throw new NotFoundError("Lead contact not found");
  }

  const activeLeadsCount = await prisma.lead.count({
    where: {
      lead_contact_id: id,
      deleted_at: null,
    },
  });

  if (activeLeadsCount > 0) {
    throw new ValidationError(
      "Lead contact cannot be deleted because it is used in active leads",
    );
  }

  const meeting = await prisma.leadActivity.findFirst({
    where: {
      activity_type: "VIDEO_CALL",
      lead: {
        lead_contact_id: id,
      },
      deleted_at: null,
    },
    select: { id: true },
  });

  if (meeting) {
    throw new ValidationError(
      "Lead contact cannot be deleted because it is used in a video call",
    );
  }

  await prisma.leadContact.update({
    where: { id },
    data: {
      deleted_at: new Date(),
      deleted_by: admin_user_id,
      updated_by: admin_user_id,
    },
  });

  return { id };
}

export async function getLeadContactById(id, admin_user_id) {
  const contact = await prisma.leadContact.findFirst({
    where: {
      id,
      deleted_at: null,
    },
    include: {
      creator: {
        select: { id: true, name: true },
      },
      updater: {
        select: { id: true, name: true },
      },
      social_links: {
        orderBy: { created_at: "asc" },
      },
    },
  });

  if (!contact) {
    throw new NotFoundError("Lead contact not found");
  }

  return contact;
}

export async function listLeadContacts(filters = {}) {
  const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
  const pageSize = Math.min(
    Number(filters.page_size) > 0 ? Number(filters.page_size) : 20,
    50,
  );

  const isCompact =
    filters.compact === "1" ||
    filters.compact === 1 ||
    filters.compact === true;

  const where = {
    deleted_at: null,
  };

  if (filters.entity_type) where.entity_type = filters.entity_type;
  if (filters.industry) where.industry = filters.industry;
  if (filters.country_code) where.country_code = filters.country_code;
  if (filters.state_code) where.state_code = filters.state_code;
  if (filters.preferred_language)
    where.preferred_language = filters.preferred_language;

  if (filters.has_email === true) {
    where.OR = [
      { primary_email: { not: null } },
      { secondary_email: { not: null } },
    ];
  }

  if (filters.has_phone === true) {
    where.OR = [
      ...(where.OR || []),
      { primary_phone: { not: null } },
      { secondary_phone: { not: null } },
    ];
  }

  const hasSearch = filters.search && filters.search.trim();
  const searchTerm = hasSearch ? filters.search.trim() : null;

  /* ----------------------------------------
     COMPACT FAST SEARCH
  ---------------------------------------- */

  if (isCompact && hasSearch) {
    const compactLimit = 100;

    const rows = await prisma.$queryRaw`
      SELECT id, contact_person, company_name, primary_email, primary_phone
      FROM "LeadContact"
      WHERE deleted_at IS NULL
        AND (
          to_tsvector(
            'english',
            contact_person || ' ' ||
            COALESCE(company_name, '') || ' ' ||
            COALESCE(primary_email, '') || ' ' ||
            COALESCE(primary_phone, '')
          ) @@ to_tsquery(
            'english',
            array_to_string(
              ARRAY(
                SELECT regexp_replace(w, '[^a-zA-Z0-9]+', '', 'g') || ':*'
                FROM unnest(regexp_split_to_array(${searchTerm}, '\\s+')) AS w
                WHERE w <> ''
              ),
              ' & '
            )
          )
        )
      ORDER BY ts_rank(
        to_tsvector(
          'english',
          contact_person || ' ' ||
          COALESCE(company_name, '') || ' ' ||
          COALESCE(primary_email, '') || ' ' ||
          COALESCE(primary_phone, '')
        ),
        to_tsquery(
          'english',
          array_to_string(
            ARRAY(
              SELECT regexp_replace(w, '[^a-zA-Z0-9]+', '', 'g') || ':*'
              FROM unnest(regexp_split_to_array(${searchTerm}, '\\s+')) AS w
              WHERE w <> ''
            ),
            ' & '
          )
        )
      ) DESC
      LIMIT ${compactLimit}
      OFFSET ${(page - 1) * pageSize}
    `;

    return {
      data: rows,
      pagination: {
        page,
        page_size: compactLimit,
        total_items: rows.length,
        total_pages: 1,
        has_more: rows.length === compactLimit,
      },
    };
  }

  /* ----------------------------------------
     NORMAL SEARCH (ID PRE-FILTER)
  ---------------------------------------- */

  if (hasSearch) {
    const searchLimit = isCompact ? pageSize : 1000;

    const searchResults = await prisma.$queryRaw`
      SELECT id
      FROM "LeadContact"
      WHERE deleted_at IS NULL
        AND (
          to_tsvector(
            'english',
            contact_person || ' ' ||
            COALESCE(company_name, '') || ' ' ||
            COALESCE(primary_email, '') || ' ' ||
            COALESCE(primary_phone, '')
          ) @@ to_tsquery(
            'english',
            array_to_string(
              ARRAY(
                SELECT regexp_replace(w, '[^a-zA-Z0-9]+', '', 'g') || ':*'
                FROM unnest(regexp_split_to_array(${searchTerm}, '\\s+')) AS w
                WHERE w <> ''
              ),
              ' | '
            )
          )
        )
      LIMIT ${searchLimit}
    `;

    const ids = searchResults.map((r) => r.id);

    if (ids.length === 0) {
      return {
        data: [],
        pagination: {
          page,
          page_size: pageSize,
          total_items: 0,
          total_pages: 0,
          has_more: false,
        },
      };
    }

    where.id = { in: ids };
  }

  const orderBy = filters.orderBy || { created_at: "desc" };

  /* ----------------------------------------
     NORMAL PAGINATED LIST
  ---------------------------------------- */

  const [items, total] = await Promise.all([
    prisma.leadContact.findMany({
      where,
      ...(isCompact
        ? {
            select: {
              id: true,
              contact_person: true,
              company_name: true,
              primary_email: true,
              primary_phone: true,
            },
          }
        : {
            include: {
              creator: {
                select: { id: true, name: true },
              },
              updater: {
                select: { id: true, name: true },
              },
              social_links: {
                orderBy: { created_at: "asc" },
              },
            },
          }),
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),

    prisma.leadContact.count({ where }),
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
}
