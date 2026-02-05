/*
  Warnings:

  - A unique constraint covering the columns `[invoice_id,id]` on the table `TaskCharge` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "TaskCharge" ADD COLUMN     "invoice_id" UUID;

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "legal_name" VARCHAR(200),
    "pan" CHAR(10),
    "gst_number" VARCHAR(15),
    "email" TEXT,
    "phone" TEXT,
    "address_line1" VARCHAR(200),
    "address_line2" VARCHAR(200),
    "city" VARCHAR(50),
    "state" "IndianState",
    "pincode" CHAR(6),
    "bank_name" VARCHAR(100),
    "bank_account_no" VARCHAR(30),
    "bank_ifsc" VARCHAR(15),
    "bank_branch" VARCHAR(100),
    "invoice_prefix" VARCHAR(20),
    "next_invoice_no" INTEGER NOT NULL DEFAULT 1,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconcile_stats_current" (
    "entity_id" UUID NOT NULL,
    "service_fee_total" DECIMAL(14,2) NOT NULL,
    "service_fee_outstanding" DECIMAL(14,2) NOT NULL,
    "service_fee_written_off" DECIMAL(14,2) NOT NULL,
    "government_fee_total" DECIMAL(14,2) NOT NULL,
    "government_fee_outstanding" DECIMAL(14,2) NOT NULL,
    "government_fee_written_off" DECIMAL(14,2) NOT NULL,
    "external_charge_total" DECIMAL(14,2) NOT NULL,
    "external_charge_outstanding" DECIMAL(14,2) NOT NULL,
    "external_charge_written_off" DECIMAL(14,2) NOT NULL,
    "client_total_outstanding" DECIMAL(14,2) NOT NULL,
    "pending_charges_count" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reconcile_stats_current_pkey" PRIMARY KEY ("entity_id")
);

-- CreateTable
CREATE TABLE "entity_task_stats" (
    "entity_id" UUID NOT NULL,
    "pending" INTEGER NOT NULL DEFAULT 0,
    "in_progress" INTEGER NOT NULL DEFAULT 0,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "cancelled" INTEGER NOT NULL DEFAULT 0,
    "on_hold" INTEGER NOT NULL DEFAULT 0,
    "pending_client_input" INTEGER NOT NULL DEFAULT 0,
    "total_tasks" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_task_stats_pkey" PRIMARY KEY ("entity_id")
);

-- CreateIndex
CREATE INDEX "CompanyProfile_name_idx" ON "CompanyProfile"("name");

-- CreateIndex
CREATE INDEX "CompanyProfile_gst_number_idx" ON "CompanyProfile"("gst_number");

-- CreateIndex
CREATE INDEX "CompanyProfile_is_default_idx" ON "CompanyProfile"("is_default");

-- CreateIndex
CREATE INDEX "TaskCharge_status_idx" ON "TaskCharge"("status");

-- CreateIndex
CREATE INDEX "TaskCharge_bearer_idx" ON "TaskCharge"("bearer");

-- CreateIndex
CREATE INDEX "TaskCharge_charge_type_idx" ON "TaskCharge"("charge_type");

-- CreateIndex
CREATE INDEX "TaskCharge_amount_idx" ON "TaskCharge"("amount");

-- CreateIndex
CREATE INDEX "TaskCharge_task_id_status_bearer_idx" ON "TaskCharge"("task_id", "status", "bearer");

-- CreateIndex
CREATE INDEX "TaskCharge_status_deleted_at_idx" ON "TaskCharge"("status", "deleted_at");

-- CreateIndex
CREATE INDEX "TaskCharge_task_id_status_bearer_charge_type_idx" ON "TaskCharge"("task_id", "status", "bearer", "charge_type");

-- CreateIndex
CREATE INDEX "TaskCharge_task_id_status_charge_type_idx" ON "TaskCharge"("task_id", "status", "charge_type");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCharge_invoice_id_id_key" ON "TaskCharge"("invoice_id", "id");
