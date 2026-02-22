-- CreateEnum
CREATE TYPE "SLAStatus" AS ENUM ('RUNNING', 'PAUSED', 'BREACHED', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "TaskCharge" DROP CONSTRAINT "TaskCharge_paid_via_invoice_id_fkey";

-- DropIndex
DROP INDEX "TaskAssignment_admin_user_id_task_id_idx";

-- DropIndex
DROP INDEX "TaskAssignment_assigned_at_idx";

-- DropIndex
DROP INDEX "TaskAssignment_assigned_by_idx";

-- AlterTable
ALTER TABLE "TaskAssignment" ADD COLUMN     "due_date" TIMESTAMP(3),
ADD COLUMN     "sla_breached_at" TIMESTAMP(3),
ADD COLUMN     "sla_days" INTEGER,
ADD COLUMN     "sla_paused_at" TIMESTAMP(3),
ADD COLUMN     "sla_status" "SLAStatus" NOT NULL DEFAULT 'RUNNING';

-- CreateIndex
CREATE INDEX "TaskAssignment_admin_user_id_due_date_idx" ON "TaskAssignment"("admin_user_id", "due_date");

-- CreateIndex
CREATE INDEX "TaskAssignment_sla_status_sla_paused_at_idx" ON "TaskAssignment"("sla_status", "sla_paused_at");

-- CreateIndex
CREATE INDEX "TaskAssignment_sla_status_due_date_idx" ON "TaskAssignment"("sla_status", "due_date");

-- AddForeignKey
ALTER TABLE "TaskCharge" ADD CONSTRAINT "TaskCharge_paid_via_invoice_id_fkey" FOREIGN KEY ("paid_via_invoice_id") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
