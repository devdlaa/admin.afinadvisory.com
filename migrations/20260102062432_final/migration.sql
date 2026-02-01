/*
  Warnings:

  - You are about to drop the column `compliance_rule_id` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `entity_registration_id` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `financial_year` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `is_assigned_to_all` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `period_end` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `period_label` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `period_start` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `task_category_id` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `task_source` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the `AdminUserDepartment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BillableModule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BillableModuleCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ComplianceRule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Department` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EntityGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EntityGroupMember` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EntityRegistration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RegistrationType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TaskCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TaskModule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TaskTemplate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TaskTemplateModule` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ChargeType" AS ENUM ('EXTERNAL_CHARGE', 'GOVERNMENT_FEE', 'SERVICE_FEE');

-- CreateEnum
CREATE TYPE "ChargeBearer" AS ENUM ('CLIENT', 'FIRM');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('NOT_PAID', 'PAID', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "PracticeFirm" AS ENUM ('DLAA_CA_FIRM', 'AFIN_ADVISORY_PVT_LTD', 'MUTUAL_FUND_ADVISORY');

-- AlterEnum
ALTER TYPE "EntityType" ADD VALUE 'ASSOCIATION_OF_PERSON';

-- DropForeignKey
ALTER TABLE "AdminUserDepartment" DROP CONSTRAINT "AdminUserDepartment_admin_user_id_fkey";

-- DropForeignKey
ALTER TABLE "AdminUserDepartment" DROP CONSTRAINT "AdminUserDepartment_department_id_fkey";

-- DropForeignKey
ALTER TABLE "BillableModule" DROP CONSTRAINT "BillableModule_category_id_fkey";

-- DropForeignKey
ALTER TABLE "BillableModule" DROP CONSTRAINT "BillableModule_created_by_fkey";

-- DropForeignKey
ALTER TABLE "BillableModule" DROP CONSTRAINT "BillableModule_updated_by_fkey";

-- DropForeignKey
ALTER TABLE "ComplianceRule" DROP CONSTRAINT "ComplianceRule_created_by_fkey";

-- DropForeignKey
ALTER TABLE "ComplianceRule" DROP CONSTRAINT "ComplianceRule_registration_type_id_fkey";

-- DropForeignKey
ALTER TABLE "ComplianceRule" DROP CONSTRAINT "ComplianceRule_updated_by_fkey";

-- DropForeignKey
ALTER TABLE "EntityGroupMember" DROP CONSTRAINT "EntityGroupMember_entity_group_id_fkey";

-- DropForeignKey
ALTER TABLE "EntityGroupMember" DROP CONSTRAINT "EntityGroupMember_entity_id_fkey";

-- DropForeignKey
ALTER TABLE "EntityRegistration" DROP CONSTRAINT "EntityRegistration_created_by_fkey";

-- DropForeignKey
ALTER TABLE "EntityRegistration" DROP CONSTRAINT "EntityRegistration_deleted_by_fkey";

-- DropForeignKey
ALTER TABLE "EntityRegistration" DROP CONSTRAINT "EntityRegistration_entity_id_fkey";

-- DropForeignKey
ALTER TABLE "EntityRegistration" DROP CONSTRAINT "EntityRegistration_registration_type_id_fkey";

-- DropForeignKey
ALTER TABLE "EntityRegistration" DROP CONSTRAINT "EntityRegistration_updated_by_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_entity_registration_id_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_task_category_id_fkey";

-- DropForeignKey
ALTER TABLE "TaskModule" DROP CONSTRAINT "TaskModule_billable_module_id_fkey";

-- DropForeignKey
ALTER TABLE "TaskModule" DROP CONSTRAINT "TaskModule_created_by_fkey";

-- DropForeignKey
ALTER TABLE "TaskModule" DROP CONSTRAINT "TaskModule_deleted_by_fkey";

-- DropForeignKey
ALTER TABLE "TaskModule" DROP CONSTRAINT "TaskModule_task_id_fkey";

-- DropForeignKey
ALTER TABLE "TaskModule" DROP CONSTRAINT "TaskModule_updated_by_fkey";

-- DropForeignKey
ALTER TABLE "TaskTemplate" DROP CONSTRAINT "TaskTemplate_compliance_rule_id_fkey";

-- DropForeignKey
ALTER TABLE "TaskTemplate" DROP CONSTRAINT "TaskTemplate_created_by_fkey";

-- DropForeignKey
ALTER TABLE "TaskTemplate" DROP CONSTRAINT "TaskTemplate_updated_by_fkey";

-- DropForeignKey
ALTER TABLE "TaskTemplateModule" DROP CONSTRAINT "TaskTemplateModule_billable_module_id_fkey";

-- DropForeignKey
ALTER TABLE "TaskTemplateModule" DROP CONSTRAINT "TaskTemplateModule_task_template_id_fkey";

-- DropIndex
DROP INDEX "Task_compliance_rule_id_idx";

-- DropIndex
DROP INDEX "Task_compliance_rule_id_status_idx";

-- DropIndex
DROP INDEX "Task_entity_id_entity_registration_id_compliance_rule_id_pe_key";

-- DropIndex
DROP INDEX "Task_entity_id_status_due_date_idx";

-- DropIndex
DROP INDEX "Task_entity_id_status_idx";

-- DropIndex
DROP INDEX "Task_priority_idx";

-- DropIndex
DROP INDEX "Task_status_due_date_idx";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "compliance_rule_id",
DROP COLUMN "entity_registration_id",
DROP COLUMN "financial_year",
DROP COLUMN "is_assigned_to_all",
DROP COLUMN "period_end",
DROP COLUMN "period_label",
DROP COLUMN "period_start",
DROP COLUMN "task_category_id",
DROP COLUMN "task_source",
ADD COLUMN     "billed_from_firm" "PracticeFirm",
ADD COLUMN     "invoice_number" TEXT,
ADD COLUMN     "is_billable" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "AdminUserDepartment";

-- DropTable
DROP TABLE "BillableModule";

-- DropTable
DROP TABLE "BillableModuleCategory";

-- DropTable
DROP TABLE "ComplianceRule";

-- DropTable
DROP TABLE "Department";

-- DropTable
DROP TABLE "EntityGroup";

-- DropTable
DROP TABLE "EntityGroupMember";

-- DropTable
DROP TABLE "EntityRegistration";

-- DropTable
DROP TABLE "RegistrationType";

-- DropTable
DROP TABLE "TaskCategory";

-- DropTable
DROP TABLE "TaskModule";

-- DropTable
DROP TABLE "TaskTemplate";

-- DropTable
DROP TABLE "TaskTemplateModule";

-- DropEnum
DROP TYPE "EntityGroupRole";

-- DropEnum
DROP TYPE "EntityGroupType";

-- DropEnum
DROP TYPE "EntityRegistrationStatus";

-- DropEnum
DROP TYPE "FrequencyUnit";

-- DropEnum
DROP TYPE "TASK_SOURCE";

-- CreateTable
CREATE TABLE "TaskCharge" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "charge_type" "ChargeType" NOT NULL,
    "bearer" "ChargeBearer" NOT NULL,
    "status" "ChargeStatus" NOT NULL,
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskCharge_task_id_idx" ON "TaskCharge"("task_id");

-- AddForeignKey
ALTER TABLE "TaskCharge" ADD CONSTRAINT "TaskCharge_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
