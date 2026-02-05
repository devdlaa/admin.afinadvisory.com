/*
  Warnings:

  - The values [FIRM] on the enum `ChargeBearer` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `invoice_prefix` on the `CompanyProfile` table. All the data in the column will be lost.
  - You are about to drop the column `next_invoice_no` on the `CompanyProfile` table. All the data in the column will be lost.
  - You are about to drop the column `billed_from_firm` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `invoice_number` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `invoice_id` on the `TaskCharge` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DocumentScope" AS ENUM ('TASK', 'INVOICE', 'ENTITY', 'COMPANY_PROFILE', 'OTHER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('REGULAR', 'SYSTEM_ADHOC');

-- AlterEnum
BEGIN;
CREATE TYPE "ChargeBearer_new" AS ENUM ('CLIENT');
ALTER TABLE "TaskCharge" ALTER COLUMN "bearer" TYPE "ChargeBearer_new" USING ("bearer"::text::"ChargeBearer_new");
ALTER TYPE "ChargeBearer" RENAME TO "ChargeBearer_old";
ALTER TYPE "ChargeBearer_new" RENAME TO "ChargeBearer";
DROP TYPE "public"."ChargeBearer_old";
COMMIT;

-- AlterEnum
ALTER TYPE "ChargeStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "ChargeType" ADD VALUE 'OTHER_CHARGES';

-- DropIndex
DROP INDEX "TaskCharge_deleted_at_idx";

-- DropIndex
DROP INDEX "TaskCharge_invoice_id_id_key";

-- DropIndex
DROP INDEX "TaskCharge_status_deleted_at_idx";

-- DropIndex
DROP INDEX "TaskCharge_task_id_idx";

-- DropIndex
DROP INDEX "TaskCharge_task_id_status_bearer_charge_type_idx";

-- DropIndex
DROP INDEX "TaskCharge_task_id_status_bearer_idx";

-- DropIndex
DROP INDEX "TaskCharge_task_id_status_charge_type_idx";

-- AlterTable
ALTER TABLE "CompanyProfile" DROP COLUMN "invoice_prefix",
DROP COLUMN "next_invoice_no";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "billed_from_firm",
DROP COLUMN "invoice_number",
ADD COLUMN     "invoice_internal_number" VARCHAR(50),
ADD COLUMN     "invoiced_at" TIMESTAMP(3),
ADD COLUMN     "is_locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_system" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "task_type" "TaskType" NOT NULL DEFAULT 'REGULAR';

-- AlterTable
ALTER TABLE "TaskCharge" DROP COLUMN "invoice_id",
ADD COLUMN     "entity_id" UUID;

-- DropEnum
DROP TYPE "PracticeFirm";

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "company_profile_id" UUID,
    "internal_number" TEXT NOT NULL,
    "external_number" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "invoice_date" TIMESTAMP(3),
    "issued_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" UUID NOT NULL,
    "object_key" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "scope" "DocumentScope" NOT NULL,
    "scope_id" TEXT NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_internal_number_key" ON "Invoice"("internal_number");

-- CreateIndex
CREATE INDEX "Invoice_entity_id_created_at_status_idx" ON "Invoice"("entity_id", "created_at", "status");

-- CreateIndex
CREATE INDEX "Invoice_entity_id_invoice_date_idx" ON "Invoice"("entity_id", "invoice_date");

-- CreateIndex
CREATE INDEX "Invoice_entity_id_status_idx" ON "Invoice"("entity_id", "status");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_external_number_idx" ON "Invoice"("external_number");

-- CreateIndex
CREATE INDEX "Invoice_invoice_date_idx" ON "Invoice"("invoice_date");

-- CreateIndex
CREATE INDEX "Invoice_created_at_idx" ON "Invoice"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Document_object_key_key" ON "Document"("object_key");

-- CreateIndex
CREATE INDEX "Document_scope_scope_id_idx" ON "Document"("scope", "scope_id");

-- CreateIndex
CREATE INDEX "Document_created_at_idx" ON "Document"("created_at");

-- CreateIndex
CREATE INDEX "Task_entity_id_is_system_created_at_idx" ON "Task"("entity_id", "is_system", "created_at");

-- CreateIndex
CREATE INDEX "Task_entity_id_task_type_created_at_idx" ON "Task"("entity_id", "task_type", "created_at");

-- CreateIndex
CREATE INDEX "Task_entity_id_status_task_category_id_created_at_idx" ON "Task"("entity_id", "status", "task_category_id", "created_at");

-- CreateIndex
CREATE INDEX "Task_task_type_entity_id_idx" ON "Task"("task_type", "entity_id");

-- CreateIndex
CREATE INDEX "Task_invoice_internal_number_idx" ON "Task"("invoice_internal_number");

-- CreateIndex
CREATE INDEX "Task_is_locked_idx" ON "Task"("is_locked");

-- CreateIndex
CREATE INDEX "TaskCharge_task_id_status_deleted_at_idx" ON "TaskCharge"("task_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "TaskCharge_created_at_idx" ON "TaskCharge"("created_at");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_invoice_internal_number_fkey" FOREIGN KEY ("invoice_internal_number") REFERENCES "Invoice"("internal_number") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_company_profile_id_fkey" FOREIGN KEY ("company_profile_id") REFERENCES "CompanyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
