import { Client } from "minio";
import { randomUUID } from "crypto";
import path from "path";

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: Number(process.env.MINIO_PORT),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

const BUCKET = process.env.MINIO_BUCKET;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
];

async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET);
  if (!exists) {
    await minioClient.makeBucket(BUCKET);
  }
}

ensureBucket().catch(console.error);

export async function uploadFile({ buffer, originalName, mimeType, folder }) {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds 50MB limit`);
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`File type "${mimeType}" is not allowed`);
  }

  const safeFolder = folder.replace(/^\/*/, "").replace(/\/*$/, "");

  const ext = path.extname(originalName);
  const objectName = `${safeFolder}/${randomUUID()}${ext}`;

  const size = buffer.length;

  await minioClient.putObject(BUCKET, objectName, buffer, size, {
    "Content-Type": mimeType,
    "X-Original-Name": encodeURIComponent(originalName),
  });

  return {
    objectName,
    bucket: BUCKET,
    size,
    mimeType,
    originalName,
    url: `/api/admin_ops/documents/download?key=${encodeURIComponent(objectName)}`,
  };
}

export async function getFileStream(objectName) {
  const decoded = decodeURIComponent(objectName);

  if (decoded.includes("..") || decoded.startsWith("/")) {
    throw new Error("Invalid object name");
  }

  return minioClient.getObject(BUCKET, decoded);
}

export async function deleteFile(objectName) {
  const decoded = decodeURIComponent(objectName);

  if (decoded.includes("..") || decoded.startsWith("/")) {
    throw new Error("Invalid object name");
  }

  await minioClient.removeObject(BUCKET, decoded);
}

export async function getSignedDownloadUrl(objectName, expirySeconds = 180) {
  const decoded = decodeURIComponent(objectName);

  if (decoded.includes("..") || decoded.startsWith("/")) {
    throw new Error("Invalid object name");
  }

  return minioClient.presignedGetObject(BUCKET, decoded, expirySeconds);
}
