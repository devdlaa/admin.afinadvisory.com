import { prisma } from "@/utils/server/db";
import { NotFoundError } from "@/utils/server/errors";

import { uploadFile, deleteFile } from "./miniio.service";

const SORT_FIELDS = {
  created_at: "created_at",
  original_name: "original_name",
  mime_type: "mime_type",
};

export async function uploadDocumentService({
  file,
  scope,
  scopeId,
  currentUserId,
}) {
  if (!file?.buffer || !file?.originalname || !file?.mimetype) {
    throw new Error("Invalid file data");
  }

  if (!scope || !scopeId || !currentUserId) {
    throw new Error("Missing required parameters");
  }

  const folder = `documents/${scope.toLowerCase()}/${scopeId}`;

  const uploaded = await uploadFile({
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    folder,
  });

  const document = await prisma.document.create({
    data: {
      object_key: uploaded.objectName,
      bucket: process.env.MINIO_BUCKET,
      url: uploaded.url,

      original_name: file.originalname,
      mime_type: file.mimetype,
      size_bytes: uploaded.size,

      scope,
      scope_id: scopeId,
      created_by: currentUserId,
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return document;
}

export async function listDocumentsService({
  scope,
  scopeId,
  page = 1,
  pageSize = 10,
  sort = "created_at",
  order = "desc",
}) {
  const validPage = Math.max(1, parseInt(page) || 1);
  const validPageSize = Math.min(100, Math.max(1, parseInt(pageSize) || 10));

  const sortField = SORT_FIELDS[sort] || "created_at";

  const where = {
    scope,
    scope_id: scopeId,
    deleted_at: null,
  };

  const [items, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        [sortField]: order,
      },
      skip: (validPage - 1) * validPageSize,
      take: validPageSize,
    }),
    prisma.document.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page: validPage,
      page_size: validPageSize,
      total_items: total,
      total_pages: Math.ceil(total / validPageSize),
      has_more: validPage * validPageSize < total,
    },
  };
}

export async function deleteDocumentService({ documentId, currentUserId }) {
  if (!documentId || !currentUserId) {
    throw new Error("Missing required parameters");
  }

  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      deleted_at: null,
    },
  });

  if (!doc) {
    throw new NotFoundError("Document not found");
  }

  try {
    await deleteFile(doc.object_key);
  } catch (error) {
    console.error("Failed to delete file from storage:", error);
  }

  await prisma.document.update({
    where: { id: doc.id },
    data: {
      deleted_at: new Date(),
    },
  });

  return { id: doc.id };
}
