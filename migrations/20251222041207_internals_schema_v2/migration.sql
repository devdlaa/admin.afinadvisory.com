/*
  Warnings:

  - You are about to drop the column `category` on the `BillableModule` table. All the data in the column will be lost.
  - You are about to drop the column `payment_mode` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Task` table. All the data in the column will be lost.
  - Added the required column `created_by` to the `ComplianceRule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `Entity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `EntityRegistration` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `state` on the `EntityRegistration` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `created_by` to the `EntityRegistrationSetting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_mode_id` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_by` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remark` to the `TaskModule` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "IndianState" AS ENUM ('ANDHRA_PRADESH', 'ARUNACHAL_PRADESH', 'ASSAM', 'BIHAR', 'CHHATTISGARH', 'GOA', 'GUJARAT', 'HARYANA', 'HIMACHAL_PRADESH', 'JHARKHAND', 'KARNATAKA', 'KERALA', 'MADHYA_PRADESH', 'MAHARASHTRA', 'MANIPUR', 'MEGHALAYA', 'MIZORAM', 'NAGALAND', 'ODISHA', 'PUNJAB', 'RAJASTHAN', 'SIKKIM', 'TAMIL_NADU', 'TELANGANA', 'TRIPURA', 'UTTAR_PRADESH', 'UTTARAKHAND', 'WEST_BENGAL', 'ANDAMAN_AND_NICOBAR_ISLANDS', 'CHANDIGARH', 'DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU', 'DELHI', 'JAMMU_AND_KASHMIR', 'LADAKH', 'LAKSHADWEEP', 'PUDUCHERRY');

-- CreateEnum
CREATE TYPE "ExpenseBearer" AS ENUM ('CLIENT', 'FIRM');

-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'PARTIALLY_PAID';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TaskStatus" ADD VALUE 'ON_HOLD';
ALTER TYPE "TaskStatus" ADD VALUE 'PENDING_CLIENT_INPUT';

-- DropIndex
DROP INDEX "BillableModule_category_idx";

-- DropIndex
DROP INDEX "BillableModule_category_is_active_idx";

-- DropIndex
DROP INDEX "Task_category_idx";

-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "auth_provider" TEXT NOT NULL DEFAULT 'credentials',
ADD COLUMN     "created_by" UUID,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" UUID,
ADD COLUMN     "provider_id" TEXT,
ADD COLUMN     "updated_by" UUID;

-- AlterTable
ALTER TABLE "BillableModule" DROP COLUMN "category",
ADD COLUMN     "category_id" UUID;

-- AlterTable
ALTER TABLE "ComplianceRule" ADD COLUMN     "created_by" UUID NOT NULL,
ADD COLUMN     "updated_by" UUID;

-- AlterTable
ALTER TABLE "Entity" ADD COLUMN     "created_by" UUID NOT NULL,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" UUID,
ADD COLUMN     "updated_by" UUID;

-- AlterTable
ALTER TABLE "EntityRegistration" ADD COLUMN     "created_by" UUID NOT NULL,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" UUID,
ADD COLUMN     "updated_by" UUID,
DROP COLUMN "state",
ADD COLUMN     "state" "IndianState" NOT NULL;

-- AlterTable
ALTER TABLE "EntityRegistrationSetting" ADD COLUMN     "created_by" UUID NOT NULL,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "updated_by" UUID;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "cancelled_by" UUID,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updated_by" UUID;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "payment_mode",
ADD COLUMN     "payment_mode_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "category",
ADD COLUMN     "has_activity" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_activity_at" TIMESTAMP(3),
ADD COLUMN     "last_activity_by" UUID,
ADD COLUMN     "task_category_id" UUID,
ADD COLUMN     "updated_by" UUID NOT NULL;

-- AlterTable
ALTER TABLE "TaskModule" ADD COLUMN     "expense_bearer" "ExpenseBearer" NOT NULL DEFAULT 'CLIENT',
ADD COLUMN     "is_recoverable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "remark" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "TaskCategory" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillableModuleCategory" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BillableModuleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMode" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PaymentMode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskCategory_name_key" ON "TaskCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BillableModuleCategory_name_key" ON "BillableModuleCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMode_code_key" ON "PaymentMode"("code");

-- CreateIndex
CREATE INDEX "BillableModule_category_id_idx" ON "BillableModule"("category_id");

-- CreateIndex
CREATE INDEX "BillableModule_category_id_is_active_idx" ON "BillableModule"("category_id", "is_active");

-- CreateIndex
CREATE INDEX "Entity_deleted_at_idx" ON "Entity"("deleted_at");

-- CreateIndex
CREATE INDEX "EntityRegistration_deleted_at_idx" ON "EntityRegistration"("deleted_at");

-- CreateIndex
CREATE INDEX "EntityRegistrationSetting_deleted_at_idx" ON "EntityRegistrationSetting"("deleted_at");

-- CreateIndex
CREATE INDEX "Invoice_updated_by_idx" ON "Invoice"("updated_by");

-- CreateIndex
CREATE INDEX "Payment_payment_mode_id_idx" ON "Payment"("payment_mode_id");

-- CreateIndex
CREATE INDEX "TaskModule_billable_module_id_is_deleted_idx" ON "TaskModule"("billable_module_id", "is_deleted");

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRegistration" ADD CONSTRAINT "EntityRegistration_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRegistration" ADD CONSTRAINT "EntityRegistration_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRegistration" ADD CONSTRAINT "EntityRegistration_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRegistrationSetting" ADD CONSTRAINT "EntityRegistrationSetting_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRegistrationSetting" ADD CONSTRAINT "EntityRegistrationSetting_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRule" ADD CONSTRAINT "ComplianceRule_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRule" ADD CONSTRAINT "ComplianceRule_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_last_activity_by_fkey" FOREIGN KEY ("last_activity_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_task_category_id_fkey" FOREIGN KEY ("task_category_id") REFERENCES "TaskCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillableModule" ADD CONSTRAINT "BillableModule_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "BillableModuleCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_payment_mode_id_fkey" FOREIGN KEY ("payment_mode_id") REFERENCES "PaymentMode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
