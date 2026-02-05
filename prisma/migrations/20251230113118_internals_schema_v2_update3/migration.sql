/*
  Warnings:

  - You are about to drop the column `two_fa_enabled` on the `AdminUser` table. All the data in the column will be lost.
  - You are about to drop the column `two_fa_secret` on the `AdminUser` table. All the data in the column will be lost.
  - You are about to drop the column `default_price` on the `BillableModule` table. All the data in the column will be lost.
  - You are about to drop the column `gst_rate` on the `BillableModule` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `BillableModule` table. All the data in the column will be lost.
  - You are about to drop the column `sac_code` on the `BillableModule` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `BillableModuleCategory` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `BillableModuleCategory` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to drop the column `applicable_entity_types` on the `ComplianceRule` table. All the data in the column will be lost.
  - You are about to drop the column `frequency_interval` on the `ComplianceRule` table. All the data in the column will be lost.
  - You are about to drop the column `frequency_unit` on the `ComplianceRule` table. All the data in the column will be lost.
  - You are about to drop the column `is_retainer` on the `Entity` table. All the data in the column will be lost.
  - You are about to drop the column `tan` on the `Entity` table. All the data in the column will be lost.
  - You are about to alter the column `code` on the `RegistrationType` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to drop the column `billing_status` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `has_activity` on the `Task` table. All the data in the column will be lost.
  - The `priority` column on the `Task` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `name` on the `TaskCategory` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to drop the column `expense_bearer` on the `TaskModule` table. All the data in the column will be lost.
  - You are about to drop the column `gst_rate` on the `TaskModule` table. All the data in the column will be lost.
  - You are about to drop the column `is_billed` on the `TaskModule` table. All the data in the column will be lost.
  - You are about to drop the column `is_recoverable` on the `TaskModule` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `TaskModule` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `TaskModule` table. All the data in the column will be lost.
  - You are about to drop the column `sac_code` on the `TaskModule` table. All the data in the column will be lost.
  - You are about to alter the column `title_template` on the `TaskTemplate` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(180)`.
  - You are about to drop the column `default_quantity` on the `TaskTemplateModule` table. All the data in the column will be lost.
  - You are about to drop the `AdminUserRole` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EntityRegistrationSetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Invoice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InvoiceLine` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentMode` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RolePermission` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[entity_id,entity_registration_id,compliance_rule_id,period_start,period_end]` on the table `Task` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[compliance_rule_id,title_template]` on the table `TaskTemplate` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `anchor_months` to the `ComplianceRule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `due_month_offset` to the `ComplianceRule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `frequency_type` to the `ComplianceRule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `period_label_type` to the `ComplianceRule` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `Entity` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `task_source` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_by` to the `TaskTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AdminUserAppRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'VIEW_ONLY');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "TASK_SOURCE" AS ENUM ('CRON_SYSTEM_GEN', 'MANUALLY', 'IMPORT');

-- AlterEnum
ALTER TYPE "AdminUserStatus" ADD VALUE 'SUSPENDED';

-- AlterEnum
ALTER TYPE "EntityType" ADD VALUE 'UNREGISTERED_INDIVIDUAL';

-- DropForeignKey
ALTER TABLE "AdminUserRole" DROP CONSTRAINT "AdminUserRole_admin_user_id_fkey";

-- DropForeignKey
ALTER TABLE "AdminUserRole" DROP CONSTRAINT "AdminUserRole_role_id_fkey";

-- DropForeignKey
ALTER TABLE "EntityRegistrationSetting" DROP CONSTRAINT "EntityRegistrationSetting_compliance_rule_id_fkey";

-- DropForeignKey
ALTER TABLE "EntityRegistrationSetting" DROP CONSTRAINT "EntityRegistrationSetting_created_by_fkey";

-- DropForeignKey
ALTER TABLE "EntityRegistrationSetting" DROP CONSTRAINT "EntityRegistrationSetting_entity_registration_id_fkey";

-- DropForeignKey
ALTER TABLE "EntityRegistrationSetting" DROP CONSTRAINT "EntityRegistrationSetting_updated_by_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_cancelled_by_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_created_by_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_entity_id_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_updated_by_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceLine" DROP CONSTRAINT "InvoiceLine_invoice_id_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceLine" DROP CONSTRAINT "InvoiceLine_task_id_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceLine" DROP CONSTRAINT "InvoiceLine_task_module_id_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_entity_id_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_invoice_id_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_payment_mode_id_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_received_by_fkey";

-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_role_id_fkey";

-- DropIndex
DROP INDEX "BillableModule_category_id_is_active_idx";

-- DropIndex
DROP INDEX "BillableModule_is_active_idx";

-- DropIndex
DROP INDEX "BillableModule_is_active_is_deleted_idx";

-- DropIndex
DROP INDEX "Entity_is_retainer_status_idx";

-- DropIndex
DROP INDEX "Entity_status_is_retainer_created_at_idx";

-- DropIndex
DROP INDEX "Task_billing_status_idx";

-- DropIndex
DROP INDEX "Task_status_billing_status_idx";

-- DropIndex
DROP INDEX "TaskModule_is_billed_idx";

-- DropIndex
DROP INDEX "TaskModule_task_id_is_billed_idx";

-- AlterTable
ALTER TABLE "AdminUser" DROP COLUMN "two_fa_enabled",
DROP COLUMN "two_fa_secret",
ADD COLUMN     "admin_role" "AdminUserAppRole" NOT NULL DEFAULT 'EMPLOYEE',
ADD COLUMN     "last_invite_sent_at" TIMESTAMP(3),
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "last_password_reset_request_at" TIMESTAMP(3),
ADD COLUMN     "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password_set_at" TIMESTAMP(3),
ADD COLUMN     "totp_secret" TEXT,
ALTER COLUMN "password" DROP NOT NULL,
ALTER COLUMN "address_line1" DROP NOT NULL,
ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "state" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'INACTIVE';

-- AlterTable
ALTER TABLE "BillableModule" DROP COLUMN "default_price",
DROP COLUMN "gst_rate",
DROP COLUMN "is_active",
DROP COLUMN "sac_code";

-- AlterTable
ALTER TABLE "BillableModuleCategory" DROP COLUMN "is_active",
ALTER COLUMN "name" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "ComplianceRule" DROP COLUMN "applicable_entity_types",
DROP COLUMN "frequency_interval",
DROP COLUMN "frequency_unit",
ADD COLUMN     "anchor_months" JSONB NOT NULL,
ADD COLUMN     "due_month_offset" INTEGER NOT NULL,
ADD COLUMN     "frequency_type" TEXT NOT NULL,
ADD COLUMN     "grace_days" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "period_label_type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Entity" DROP COLUMN "is_retainer",
DROP COLUMN "tan",
ADD COLUMN     "contact_person" CHAR(100),
ALTER COLUMN "pan" DROP NOT NULL,
ALTER COLUMN "pan" SET DATA TYPE TEXT,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "address_line1" DROP NOT NULL,
ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "state" DROP NOT NULL;

-- AlterTable
ALTER TABLE "EntityRegistration" ALTER COLUMN "effective_from" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RegistrationType" ADD COLUMN     "validation_hint" TEXT,
ADD COLUMN     "validation_regex" TEXT,
ALTER COLUMN "code" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "name" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "billing_status",
DROP COLUMN "has_activity",
ADD COLUMN     "entity_registration_id" UUID,
ADD COLUMN     "financial_year" TEXT,
ADD COLUMN     "period_end" TIMESTAMP(3),
ADD COLUMN     "period_label" TEXT,
ADD COLUMN     "period_start" TIMESTAMP(3),
ADD COLUMN     "task_source" "TASK_SOURCE" NOT NULL,
DROP COLUMN "priority",
ADD COLUMN     "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "TaskCategory" ALTER COLUMN "name" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "TaskModule" DROP COLUMN "expense_bearer",
DROP COLUMN "gst_rate",
DROP COLUMN "is_billed",
DROP COLUMN "is_recoverable",
DROP COLUMN "price",
DROP COLUMN "quantity",
DROP COLUMN "sac_code",
ALTER COLUMN "remark" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TaskTemplate" ADD COLUMN     "updated_by" UUID NOT NULL,
ALTER COLUMN "title_template" SET DATA TYPE VARCHAR(180);

-- AlterTable
ALTER TABLE "TaskTemplateModule" DROP COLUMN "default_quantity";

-- DropTable
DROP TABLE "AdminUserRole";

-- DropTable
DROP TABLE "EntityRegistrationSetting";

-- DropTable
DROP TABLE "Invoice";

-- DropTable
DROP TABLE "InvoiceLine";

-- DropTable
DROP TABLE "Payment";

-- DropTable
DROP TABLE "PaymentMode";

-- DropTable
DROP TABLE "Role";

-- DropTable
DROP TABLE "RolePermission";

-- DropEnum
DROP TYPE "BillingStatus";

-- DropEnum
DROP TYPE "ExpenseBearer";

-- DropEnum
DROP TYPE "InvoiceStatus";

-- DropEnum
DROP TYPE "PaymentStatus";

-- CreateTable
CREATE TABLE "AdminUserPermission" (
    "admin_user_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUserPermission_pkey" PRIMARY KEY ("admin_user_id","permission_id")
);

-- CreateIndex
CREATE INDEX "AdminUserPermission_admin_user_id_idx" ON "AdminUserPermission"("admin_user_id");

-- CreateIndex
CREATE INDEX "AdminUserPermission_permission_id_idx" ON "AdminUserPermission"("permission_id");

-- CreateIndex
CREATE INDEX "Entity_status_created_at_idx" ON "Entity"("status", "created_at");

-- CreateIndex
CREATE INDEX "Task_priority_idx" ON "Task"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "Task_entity_id_entity_registration_id_compliance_rule_id_pe_key" ON "Task"("entity_id", "entity_registration_id", "compliance_rule_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "TaskTemplate_updated_by_idx" ON "TaskTemplate"("updated_by");

-- CreateIndex
CREATE UNIQUE INDEX "TaskTemplate_compliance_rule_id_title_template_key" ON "TaskTemplate"("compliance_rule_id", "title_template");

-- AddForeignKey
ALTER TABLE "AdminUserPermission" ADD CONSTRAINT "AdminUserPermission_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUserPermission" ADD CONSTRAINT "AdminUserPermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_entity_registration_id_fkey" FOREIGN KEY ("entity_registration_id") REFERENCES "EntityRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
