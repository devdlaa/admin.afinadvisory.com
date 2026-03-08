-- CreateEnum
CREATE TYPE "AdminUserAppRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'VIEW_ONLY');

-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DocumentScope" AS ENUM ('TASK', 'INVOICE', 'ENTITY', 'COMPANY_PROFILE', 'OTHER', 'REMINDER');

-- CreateEnum
CREATE TYPE "AdminUserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SLAStatus" AS ENUM ('NONE', 'RUNNING', 'PAUSED', 'BREACHED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ChargeType" AS ENUM ('EXTERNAL_CHARGE', 'GOVERNMENT_FEE', 'SERVICE_FEE', 'OTHER_CHARGES');

-- CreateEnum
CREATE TYPE "ChargeBearer" AS ENUM ('CLIENT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('NOT_PAID', 'PAID', 'WRITTEN_OFF', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD', 'PENDING_CLIENT_INPUT');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('REGULAR', 'SYSTEM_ADHOC');

-- CreateEnum
CREATE TYPE "IndianState" AS ENUM ('ANDHRA_PRADESH', 'ARUNACHAL_PRADESH', 'ASSAM', 'BIHAR', 'CHHATTISGARH', 'GOA', 'GUJARAT', 'HARYANA', 'HIMACHAL_PRADESH', 'JHARKHAND', 'KARNATAKA', 'KERALA', 'MADHYA_PRADESH', 'MAHARASHTRA', 'MANIPUR', 'MEGHALAYA', 'MIZORAM', 'NAGALAND', 'ODISHA', 'PUNJAB', 'RAJASTHAN', 'SIKKIM', 'TAMIL_NADU', 'TELANGANA', 'TRIPURA', 'UTTAR_PRADESH', 'UTTARAKHAND', 'WEST_BENGAL', 'ANDAMAN_AND_NICOBAR_ISLANDS', 'CHANDIGARH', 'DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU', 'DELHI', 'JAMMU_AND_KASHMIR', 'LADAKH', 'LAKSHADWEEP', 'PUDUCHERRY');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('INDIVIDUAL', 'UN_REGISTRED', 'PRIVATE_LIMITED_COMPANY', 'PUBLIC_LIMITED_COMPANY', 'ONE_PERSON_COMPANY', 'SECTION_8_COMPANY', 'PRODUCER_COMPANY', 'SOLE_PROPRIETORSHIP', 'PARTNERSHIP_FIRM', 'LIMITED_LIABILITY_PARTNERSHIP', 'TRUST', 'SOCIETY', 'COOPERATIVE_SOCIETY', 'FOREIGN_COMPANY', 'GOVERNMENT_COMPANY', 'ASSOCIATION_OF_PERSON', 'HUF');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "Entity" (
    "id" UUID NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "pan" TEXT,
    "email" TEXT NOT NULL,
    "primary_phone" TEXT NOT NULL,
    "secondary_phone" TEXT,
    "address_line1" VARCHAR(200),
    "address_line2" VARCHAR(200),
    "city" VARCHAR(50),
    "state" VARCHAR(50),
    "pincode" CHAR(6),
    "status" "EntityStatus" NOT NULL DEFAULT 'INACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "updated_by" UUID,
    "contact_person" VARCHAR(100),

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityCustomField" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "value" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "auth_provider" TEXT NOT NULL DEFAULT 'credentials',
    "created_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "provider_id" TEXT,
    "updated_by" UUID,
    "address_line1" VARCHAR(200),
    "address_line2" VARCHAR(200),
    "alternate_phone" TEXT,
    "city" VARCHAR(50),
    "date_of_joining" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "phone" TEXT NOT NULL,
    "pincode" CHAR(6),
    "state" "IndianState",
    "status" "AdminUserStatus" NOT NULL DEFAULT 'INACTIVE',
    "two_fa_verified_at" TIMESTAMP(3),
    "user_code" TEXT NOT NULL,
    "admin_role" "AdminUserAppRole" NOT NULL DEFAULT 'EMPLOYEE',
    "last_invite_sent_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "last_password_reset_request_at" TIMESTAMP(3),
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "password_set_at" TIMESTAMP(3),
    "totp_secret" TEXT,
    "onboarding_token_hash" TEXT,
    "is_2fa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_token_expires_at" TIMESTAMP(3),
    "password_reset_token_expires_at" TIMESTAMP(3),
    "password_reset_token_hash" TEXT,
    "last_onboarding_reset_request_at" TIMESTAMP(3),
    "onboarding_reset_token_expires_at" TIMESTAMP(3),
    "onboarding_reset_token_hash" TEXT,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUserPermission" (
    "admin_user_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUserPermission_pkey" PRIMARY KEY ("admin_user_id","permission_id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT,
    "label" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_user_counter" (
    "id" TEXT NOT NULL,
    "current_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_user_counter_pkey" PRIMARY KEY ("id")
);

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
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "updated_by" UUID NOT NULL,
    "restored_by" UUID,
    "entity_id" UUID,
    "paid_via_invoice_id" UUID,

    CONSTRAINT "TaskCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskCategory" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID NOT NULL,

    CONSTRAINT "TaskCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskChecklistItem" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "is_done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "TaskChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAssignment" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "assigned_by" UUID NOT NULL,
    "assignment_source" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sla_days" INTEGER,
    "due_date" TIMESTAMP(3),
    "sla_status" "SLAStatus" NOT NULL DEFAULT 'RUNNING',
    "sla_paused_at" TIMESTAMP(3),
    "sla_breached_at" TIMESTAMP(3),

    CONSTRAINT "TaskAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "entity_id" UUID,
    "created_by" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_activity_at" TIMESTAMP(3),
    "last_activity_by" UUID,
    "updated_by" UUID NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "is_billable" BOOLEAN NOT NULL DEFAULT false,
    "assigned_to_all" BOOLEAN NOT NULL DEFAULT false,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "last_comment_at" TIMESTAMP(3),
    "last_commented_by" UUID,
    "task_category_id" UUID,
    "invoice_internal_number" VARCHAR(50),
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "invoiced_at" TIMESTAMP(3),
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "task_type" "TaskType" NOT NULL DEFAULT 'REGULAR',

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPushToken" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "device" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPushToken_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "Reminder" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_by" UUID NOT NULL,
    "assigned_to" UUID NOT NULL,
    "task_id" UUID,
    "due_at" TIMESTAMP(3) NOT NULL,
    "is_time_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "snoozed_until" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_type" "RecurrenceType",
    "recurrence_every" INTEGER,
    "recurrence_end" TIMESTAMP(3),
    "recurrence_ends_after" INTEGER,
    "week_days" INTEGER[],
    "repeat_by" TEXT,
    "parent_id" UUID,
    "bucket_id" UUID,
    "google_event_id" TEXT,
    "google_synced_at" TIMESTAMP(3),
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderBucket" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "normalized_name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'HASH',

    CONSTRAINT "ReminderBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderTag" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" VARCHAR(20) NOT NULL,
    "normalized_name" TEXT NOT NULL,

    CONSTRAINT "ReminderTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderTagMap" (
    "reminder_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "ReminderTagMap_pkey" PRIMARY KEY ("reminder_id","tag_id")
);

-- CreateTable
CREATE TABLE "ReminderChecklistItem" (
    "id" UUID NOT NULL,
    "reminder_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "is_done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,

    CONSTRAINT "ReminderChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderNotification" (
    "id" UUID NOT NULL,
    "reminder_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt" TIMESTAMP(3),
    "next_retry_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotificationPreference" (
    "user_id" UUID NOT NULL,
    "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp_opted_in_at" TIMESTAMP(3),
    "whatsapp_last_verified_at" TIMESTAMP(3),
    "whatsapp_opt_out_at" TIMESTAMP(3),
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "daily_summary_enabled" BOOLEAN NOT NULL DEFAULT true,
    "summary_send_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Entity_pan_key" ON "Entity"("pan");

-- CreateIndex
CREATE INDEX "Entity_name_idx" ON "Entity"("name");

-- CreateIndex
CREATE INDEX "Entity_pan_idx" ON "Entity"("pan");

-- CreateIndex
CREATE INDEX "Entity_email_idx" ON "Entity"("email");

-- CreateIndex
CREATE INDEX "Entity_status_idx" ON "Entity"("status");

-- CreateIndex
CREATE INDEX "Entity_created_at_idx" ON "Entity"("created_at");

-- CreateIndex
CREATE INDEX "Entity_deleted_at_idx" ON "Entity"("deleted_at");

-- CreateIndex
CREATE INDEX "Entity_status_created_at_idx" ON "Entity"("status", "created_at");

-- CreateIndex
CREATE INDEX "EntityCustomField_entity_id_idx" ON "EntityCustomField"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "EntityCustomField_entity_id_name_key" ON "EntityCustomField"("entity_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_phone_key" ON "AdminUser"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_user_code_key" ON "AdminUser"("user_code");

-- CreateIndex
CREATE INDEX "AdminUser_email_idx" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_name_idx" ON "AdminUser"("name");

-- CreateIndex
CREATE INDEX "AdminUser_user_code_idx" ON "AdminUser"("user_code");

-- CreateIndex
CREATE INDEX "AdminUser_phone_idx" ON "AdminUser"("phone");

-- CreateIndex
CREATE INDEX "AdminUser_status_idx" ON "AdminUser"("status");

-- CreateIndex
CREATE INDEX "AdminUserPermission_admin_user_id_idx" ON "AdminUserPermission"("admin_user_id");

-- CreateIndex
CREATE INDEX "AdminUserPermission_permission_id_idx" ON "AdminUserPermission"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "TaskCharge_task_id_status_deleted_at_idx" ON "TaskCharge"("task_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "TaskCharge_status_idx" ON "TaskCharge"("status");

-- CreateIndex
CREATE INDEX "TaskCharge_bearer_idx" ON "TaskCharge"("bearer");

-- CreateIndex
CREATE INDEX "TaskCharge_charge_type_idx" ON "TaskCharge"("charge_type");

-- CreateIndex
CREATE INDEX "TaskCharge_amount_idx" ON "TaskCharge"("amount");

-- CreateIndex
CREATE INDEX "TaskCharge_created_at_idx" ON "TaskCharge"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCategory_name_key" ON "TaskCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCategory_code_key" ON "TaskCategory"("code");

-- CreateIndex
CREATE INDEX "TaskChecklistItem_task_id_idx" ON "TaskChecklistItem"("task_id");

-- CreateIndex
CREATE INDEX "TaskChecklistItem_created_by_idx" ON "TaskChecklistItem"("created_by");

-- CreateIndex
CREATE INDEX "TaskChecklistItem_updated_by_idx" ON "TaskChecklistItem"("updated_by");

-- CreateIndex
CREATE INDEX "TaskChecklistItem_deleted_by_idx" ON "TaskChecklistItem"("deleted_by");

-- CreateIndex
CREATE INDEX "TaskAssignment_task_id_idx" ON "TaskAssignment"("task_id");

-- CreateIndex
CREATE INDEX "TaskAssignment_admin_user_id_idx" ON "TaskAssignment"("admin_user_id");

-- CreateIndex
CREATE INDEX "TaskAssignment_admin_user_id_due_date_idx" ON "TaskAssignment"("admin_user_id", "due_date");

-- CreateIndex
CREATE INDEX "TaskAssignment_sla_status_sla_paused_at_idx" ON "TaskAssignment"("sla_status", "sla_paused_at");

-- CreateIndex
CREATE INDEX "TaskAssignment_sla_status_due_date_idx" ON "TaskAssignment"("sla_status", "due_date");

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
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_entity_id_idx" ON "Task"("entity_id");

-- CreateIndex
CREATE INDEX "Task_task_category_id_idx" ON "Task"("task_category_id");

-- CreateIndex
CREATE INDEX "Task_created_by_idx" ON "Task"("created_by");

-- CreateIndex
CREATE INDEX "Task_due_date_idx" ON "Task"("due_date");

-- CreateIndex
CREATE INDEX "Task_created_at_idx" ON "Task"("created_at");

-- CreateIndex
CREATE INDEX "Task_deleted_at_idx" ON "Task"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "UserPushToken_token_key" ON "UserPushToken"("token");

-- CreateIndex
CREATE INDEX "UserPushToken_user_id_idx" ON "UserPushToken"("user_id");

-- CreateIndex
CREATE INDEX "CompanyProfile_name_idx" ON "CompanyProfile"("name");

-- CreateIndex
CREATE INDEX "CompanyProfile_gst_number_idx" ON "CompanyProfile"("gst_number");

-- CreateIndex
CREATE INDEX "CompanyProfile_is_default_idx" ON "CompanyProfile"("is_default");

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
CREATE INDEX "Reminder_assigned_to_status_due_at_idx" ON "Reminder"("assigned_to", "status", "due_at");

-- CreateIndex
CREATE INDEX "Reminder_due_at_idx" ON "Reminder"("due_at");

-- CreateIndex
CREATE INDEX "Reminder_status_idx" ON "Reminder"("status");

-- CreateIndex
CREATE INDEX "Reminder_task_id_idx" ON "Reminder"("task_id");

-- CreateIndex
CREATE INDEX "Reminder_bucket_id_idx" ON "Reminder"("bucket_id");

-- CreateIndex
CREATE INDEX "Reminder_deleted_at_idx" ON "Reminder"("deleted_at");

-- CreateIndex
CREATE INDEX "Reminder_created_by_status_due_at_idx" ON "Reminder"("created_by", "status", "due_at");

-- CreateIndex
CREATE INDEX "Reminder_assigned_to_due_at_deleted_at_idx" ON "Reminder"("assigned_to", "due_at", "deleted_at");

-- CreateIndex
CREATE INDEX "Reminder_assigned_to_status_deleted_at_idx" ON "Reminder"("assigned_to", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "Reminder_parent_id_idx" ON "Reminder"("parent_id");

-- CreateIndex
CREATE INDEX "Reminder_status_due_at_idx" ON "Reminder"("status", "due_at");

-- CreateIndex
CREATE INDEX "Reminder_is_recurring_recurrence_end_idx" ON "Reminder"("is_recurring", "recurrence_end");

-- CreateIndex
CREATE INDEX "Reminder_task_id_status_idx" ON "Reminder"("task_id", "status");

-- CreateIndex
CREATE INDEX "Reminder_snoozed_until_idx" ON "Reminder"("snoozed_until");

-- CreateIndex
CREATE INDEX "Reminder_google_event_id_idx" ON "Reminder"("google_event_id");

-- CreateIndex
CREATE INDEX "Reminder_created_at_idx" ON "Reminder"("created_at");

-- CreateIndex
CREATE INDEX "ReminderBucket_user_id_idx" ON "ReminderBucket"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderBucket_user_id_name_key" ON "ReminderBucket"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderBucket_user_id_normalized_name_key" ON "ReminderBucket"("user_id", "normalized_name");

-- CreateIndex
CREATE INDEX "ReminderTag_user_id_idx" ON "ReminderTag"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderTag_user_id_name_key" ON "ReminderTag"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderTag_user_id_normalized_name_key" ON "ReminderTag"("user_id", "normalized_name");

-- CreateIndex
CREATE INDEX "ReminderTagMap_tag_id_idx" ON "ReminderTagMap"("tag_id");

-- CreateIndex
CREATE INDEX "ReminderTagMap_reminder_id_idx" ON "ReminderTagMap"("reminder_id");

-- CreateIndex
CREATE INDEX "ReminderChecklistItem_reminder_id_idx" ON "ReminderChecklistItem"("reminder_id");

-- CreateIndex
CREATE INDEX "ReminderNotification_reminder_id_idx" ON "ReminderNotification"("reminder_id");

-- CreateIndex
CREATE INDEX "ReminderNotification_user_id_idx" ON "ReminderNotification"("user_id");

-- CreateIndex
CREATE INDEX "ReminderNotification_status_idx" ON "ReminderNotification"("status");

-- CreateIndex
CREATE INDEX "ReminderNotification_channel_idx" ON "ReminderNotification"("channel");

-- CreateIndex
CREATE INDEX "UserNotificationPreference_whatsapp_enabled_idx" ON "UserNotificationPreference"("whatsapp_enabled");

-- CreateIndex
CREATE INDEX "UserNotificationPreference_email_enabled_idx" ON "UserNotificationPreference"("email_enabled");

-- CreateIndex
CREATE INDEX "UserNotificationPreference_daily_summary_enabled_summary_se_idx" ON "UserNotificationPreference"("daily_summary_enabled", "summary_send_time");

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityCustomField" ADD CONSTRAINT "EntityCustomField_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUserPermission" ADD CONSTRAINT "AdminUserPermission_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUserPermission" ADD CONSTRAINT "AdminUserPermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCharge" ADD CONSTRAINT "TaskCharge_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCharge" ADD CONSTRAINT "TaskCharge_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCharge" ADD CONSTRAINT "TaskCharge_restored_by_fkey" FOREIGN KEY ("restored_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCharge" ADD CONSTRAINT "TaskCharge_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCharge" ADD CONSTRAINT "TaskCharge_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCharge" ADD CONSTRAINT "TaskCharge_paid_via_invoice_id_fkey" FOREIGN KEY ("paid_via_invoice_id") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChecklistItem" ADD CONSTRAINT "TaskChecklistItem_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChecklistItem" ADD CONSTRAINT "TaskChecklistItem_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChecklistItem" ADD CONSTRAINT "TaskChecklistItem_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChecklistItem" ADD CONSTRAINT "TaskChecklistItem_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_invoice_internal_number_fkey" FOREIGN KEY ("invoice_internal_number") REFERENCES "Invoice"("internal_number") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_last_activity_by_fkey" FOREIGN KEY ("last_activity_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_task_category_id_fkey" FOREIGN KEY ("task_category_id") REFERENCES "TaskCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPushToken" ADD CONSTRAINT "UserPushToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconcile_stats_current" ADD CONSTRAINT "reconcile_stats_current_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_company_profile_id_fkey" FOREIGN KEY ("company_profile_id") REFERENCES "CompanyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Reminder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "ReminderBucket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderBucket" ADD CONSTRAINT "ReminderBucket_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderTag" ADD CONSTRAINT "ReminderTag_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderTagMap" ADD CONSTRAINT "ReminderTagMap_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "Reminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderTagMap" ADD CONSTRAINT "ReminderTagMap_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "ReminderTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderChecklistItem" ADD CONSTRAINT "ReminderChecklistItem_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "Reminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderChecklistItem" ADD CONSTRAINT "ReminderChecklistItem_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderChecklistItem" ADD CONSTRAINT "ReminderChecklistItem_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderNotification" ADD CONSTRAINT "ReminderNotification_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "Reminder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderNotification" ADD CONSTRAINT "ReminderNotification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
