import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["warn", "error"],
  });

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
