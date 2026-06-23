/*
  Warnings:

  - The primary key for the `ActivityDailyStats` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `user_id` column on the `LeadDailyStats` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `closed_by` column on the `LeadDailyStats` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[external_id]` on the table `LeadSourceData` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `user_id` on the `ActivityDailyStats` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `LeadStageDuration` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `LeadUserScore` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TaskReferenceType" AS ENUM ('INFLUENCER', 'ENTITY', 'EXTERNAL_PERSON');

-- CreateEnum
CREATE TYPE "GmailLabelType" AS ENUM ('SYSTEM', 'USER');

-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "EmailSyncStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR', 'REVOKED');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('DRAFT', 'SENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('GMAIL', 'OUTLOOK', 'IMAP');

-- CreateEnum
CREATE TYPE "EmailAuthType" AS ENUM ('OAUTH', 'IMAP_SMTP');

-- AlterEnum
ALTER TYPE "ActivityMissedBy" ADD VALUE 'SYSTEM';

-- DropIndex
DROP INDEX "lead_search_vector_gin";

-- DropIndex
DROP INDEX "lead_title_vector_gin";

-- AlterTable
ALTER TABLE "ActivityDailyStats" DROP CONSTRAINT "ActivityDailyStats_pkey",
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "ActivityDailyStats_pkey" PRIMARY KEY ("date", "user_id", "company_profile_id");

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "ai_summary_input_hash" TEXT,
ALTER COLUMN "title_vector" DROP DEFAULT;

-- AlterTable
ALTER TABLE "LeadDailyStats" DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID,
DROP COLUMN "closed_by",
ADD COLUMN     "closed_by" UUID;

-- AlterTable
ALTER TABLE "LeadSourceData" ADD COLUMN     "is_finalized" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "LeadStageDuration" DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "LeadUserScore" DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL;

-- CreateTable
CREATE TABLE "TaskReference" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "type" "TaskReferenceType" NOT NULL,
    "influencer_id" UUID,
    "entity_id" UUID,
    "name" VARCHAR(120),
    "phone" VARCHAR(20),
    "email" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "GmailAccount" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "provider" "EmailProvider" NOT NULL DEFAULT 'GMAIL',
    "auth_type" "EmailAuthType" NOT NULL DEFAULT 'OAUTH',
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "imap_host" TEXT,
    "imap_port" INTEGER,
    "smtp_host" TEXT,
    "smtp_port" INTEGER,
    "smtp_secure" BOOLEAN,
    "history_id" TEXT,
    "sync_status" "EmailSyncStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_synced_at" TIMESTAMP(3),
    "last_sync_error" TEXT,
    "sync_error_count" INTEGER NOT NULL DEFAULT 0,
    "is_token_encrypted" BOOLEAN NOT NULL DEFAULT true,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GmailLabel" (
    "id" UUID NOT NULL,
    "gmail_label_id" TEXT NOT NULL,
    "account_id" UUID NOT NULL,
    "provider_label_id" TEXT,
    "name" TEXT NOT NULL,
    "type" "GmailLabelType" NOT NULL,
    "text_color" TEXT,
    "background_color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GmailLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailThread" (
    "id" UUID NOT NULL,
    "gmail_thread_id" TEXT NOT NULL,
    "provider_thread_id" TEXT,
    "account_id" UUID NOT NULL,
    "subject" TEXT,
    "snippet" TEXT,
    "last_message_at" TIMESTAMP(3) NOT NULL,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "has_unread" BOOLEAN NOT NULL DEFAULT false,
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "is_important" BOOLEAN NOT NULL DEFAULT false,
    "last_message_id" UUID,
    "participants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" UUID NOT NULL,
    "gmail_message_id" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "thread_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "direction" "EmailDirection" NOT NULL DEFAULT 'INBOUND',
    "from_email" TEXT NOT NULL,
    "from_name" TEXT,
    "to_emails" TEXT[],
    "cc_emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bcc_emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reply_to_email" TEXT,
    "headers" JSONB,
    "subject" TEXT,
    "snippet" TEXT,
    "body_html" TEXT,
    "body_text" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_starred" BOOLEAN NOT NULL DEFAULT false,
    "is_important" BOOLEAN NOT NULL DEFAULT false,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "is_sent" BOOLEAN NOT NULL DEFAULT false,
    "is_trashed" BOOLEAN NOT NULL DEFAULT false,
    "has_attachments" BOOLEAN NOT NULL DEFAULT false,
    "draft_status" "DraftStatus",
    "send_error" TEXT,
    "sent_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3) NOT NULL,
    "internal_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "search_vector" tsvector,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessageLabel" (
    "message_id" UUID NOT NULL,
    "label_id" UUID NOT NULL,

    CONSTRAINT "EmailMessageLabel_pkey" PRIMARY KEY ("message_id","label_id")
);

-- CreateTable
CREATE TABLE "EmailAttachment" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "gmail_attachment_id" TEXT,
    "provider_attachment_id" TEXT,
    "document_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_inline" BOOLEAN NOT NULL DEFAULT false,
    "content_id" TEXT,

    CONSTRAINT "EmailAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GmailSendAs" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "send_as_email" TEXT NOT NULL,
    "display_name" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GmailSendAs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLink" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "entity_id" UUID,
    "lead_id" UUID,
    "task_id" UUID,
    "linked_by" UUID,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSignature" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EmailSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskReference_influencer_id_idx" ON "TaskReference"("influencer_id");

-- CreateIndex
CREATE INDEX "TaskReference_entity_id_idx" ON "TaskReference"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "TaskReference_task_id_key" ON "TaskReference"("task_id");

-- CreateIndex
CREATE INDEX "GmailAccount_user_id_idx" ON "GmailAccount"("user_id");

-- CreateIndex
CREATE INDEX "GmailAccount_sync_status_idx" ON "GmailAccount"("sync_status");

-- CreateIndex
CREATE UNIQUE INDEX "GmailAccount_user_id_email_key" ON "GmailAccount"("user_id", "email");

-- CreateIndex
CREATE INDEX "GmailLabel_account_id_idx" ON "GmailLabel"("account_id");

-- CreateIndex
CREATE INDEX "GmailLabel_gmail_label_id_idx" ON "GmailLabel"("gmail_label_id");

-- CreateIndex
CREATE UNIQUE INDEX "GmailLabel_account_id_gmail_label_id_key" ON "GmailLabel"("account_id", "gmail_label_id");

-- CreateIndex
CREATE INDEX "EmailThread_account_id_last_message_at_idx" ON "EmailThread"("account_id", "last_message_at");

-- CreateIndex
CREATE INDEX "EmailThread_account_id_has_unread_last_message_at_idx" ON "EmailThread"("account_id", "has_unread", "last_message_at");

-- CreateIndex
CREATE INDEX "EmailThread_account_id_is_starred_idx" ON "EmailThread"("account_id", "is_starred");

-- CreateIndex
CREATE INDEX "EmailThread_account_id_is_important_idx" ON "EmailThread"("account_id", "is_important");

-- CreateIndex
CREATE INDEX "EmailThread_account_id_provider_thread_id_idx" ON "EmailThread"("account_id", "provider_thread_id");

-- CreateIndex
CREATE UNIQUE INDEX "EmailThread_account_id_gmail_thread_id_key" ON "EmailThread"("account_id", "gmail_thread_id");

-- CreateIndex
CREATE INDEX "EmailMessage_account_id_received_at_idx" ON "EmailMessage"("account_id", "received_at");

-- CreateIndex
CREATE INDEX "EmailMessage_account_id_is_read_received_at_idx" ON "EmailMessage"("account_id", "is_read", "received_at");

-- CreateIndex
CREATE INDEX "EmailMessage_account_id_is_draft_idx" ON "EmailMessage"("account_id", "is_draft");

-- CreateIndex
CREATE INDEX "EmailMessage_account_id_direction_received_at_idx" ON "EmailMessage"("account_id", "direction", "received_at");

-- CreateIndex
CREATE INDEX "EmailMessage_thread_id_idx" ON "EmailMessage"("thread_id");

-- CreateIndex
CREATE INDEX "EmailMessage_from_email_idx" ON "EmailMessage"("from_email");

-- CreateIndex
CREATE INDEX "EmailMessage_account_id_thread_id_received_at_idx" ON "EmailMessage"("account_id", "thread_id", "received_at");

-- CreateIndex
CREATE INDEX "EmailMessage_account_id_is_trashed_received_at_idx" ON "EmailMessage"("account_id", "is_trashed", "received_at");

-- CreateIndex
CREATE INDEX "EmailMessage_account_id_has_attachments_idx" ON "EmailMessage"("account_id", "has_attachments");

-- CreateIndex
CREATE INDEX "EmailMessage_account_id_provider_message_id_idx" ON "EmailMessage"("account_id", "provider_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_account_id_gmail_message_id_key" ON "EmailMessage"("account_id", "gmail_message_id");

-- CreateIndex
CREATE INDEX "EmailMessageLabel_label_id_idx" ON "EmailMessageLabel"("label_id");

-- CreateIndex
CREATE INDEX "EmailMessageLabel_message_id_idx" ON "EmailMessageLabel"("message_id");

-- CreateIndex
CREATE INDEX "EmailAttachment_message_id_idx" ON "EmailAttachment"("message_id");

-- CreateIndex
CREATE INDEX "EmailAttachment_document_id_idx" ON "EmailAttachment"("document_id");

-- CreateIndex
CREATE INDEX "GmailSendAs_account_id_idx" ON "GmailSendAs"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "GmailSendAs_account_id_send_as_email_key" ON "GmailSendAs"("account_id", "send_as_email");

-- CreateIndex
CREATE INDEX "EmailLink_message_id_idx" ON "EmailLink"("message_id");

-- CreateIndex
CREATE INDEX "EmailLink_entity_id_idx" ON "EmailLink"("entity_id");

-- CreateIndex
CREATE INDEX "EmailLink_lead_id_idx" ON "EmailLink"("lead_id");

-- CreateIndex
CREATE INDEX "EmailLink_task_id_idx" ON "EmailLink"("task_id");

-- CreateIndex
CREATE INDEX "ActivityDailyStats_user_id_idx" ON "ActivityDailyStats"("user_id");

-- CreateIndex
CREATE INDEX "ActivityDailyStats_company_profile_id_user_id_date_idx" ON "ActivityDailyStats"("company_profile_id", "user_id", "date");

-- CreateIndex
CREATE INDEX "LeadDailyStats_user_id_idx" ON "LeadDailyStats"("user_id");

-- CreateIndex
CREATE INDEX "LeadDailyStats_closed_by_idx" ON "LeadDailyStats"("closed_by");

-- CreateIndex
CREATE INDEX "LeadDailyStats_company_profile_id_user_id_date_idx" ON "LeadDailyStats"("company_profile_id", "user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "LeadDailyStats_date_user_id_closed_by_pipeline_id_stage_id__key" ON "LeadDailyStats"("date", "user_id", "closed_by", "pipeline_id", "stage_id", "source", "company_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "LeadSourceData_external_id_key" ON "LeadSourceData"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "LeadStageDuration_date_stage_id_pipeline_id_user_id_company_key" ON "LeadStageDuration"("date", "stage_id", "pipeline_id", "user_id", "company_profile_id");

-- CreateIndex
CREATE INDEX "LeadUserScore_user_id_idx" ON "LeadUserScore"("user_id");

-- AddForeignKey
ALTER TABLE "TaskReference" ADD CONSTRAINT "TaskReference_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskReference" ADD CONSTRAINT "TaskReference_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "Influencer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskReference" ADD CONSTRAINT "TaskReference_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadDailyStats" ADD CONSTRAINT "LeadDailyStats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadDailyStats" ADD CONSTRAINT "LeadDailyStats_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityDailyStats" ADD CONSTRAINT "ActivityDailyStats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStageDuration" ADD CONSTRAINT "LeadStageDuration_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadUserScore" ADD CONSTRAINT "LeadUserScore_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GmailAccount" ADD CONSTRAINT "GmailAccount_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GmailLabel" ADD CONSTRAINT "GmailLabel_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "GmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "GmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "EmailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "GmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessageLabel" ADD CONSTRAINT "EmailMessageLabel_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessageLabel" ADD CONSTRAINT "EmailMessageLabel_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "GmailLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAttachment" ADD CONSTRAINT "EmailAttachment_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GmailSendAs" ADD CONSTRAINT "GmailSendAs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "GmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLink" ADD CONSTRAINT "EmailLink_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "EmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLink" ADD CONSTRAINT "EmailLink_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLink" ADD CONSTRAINT "EmailLink_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLink" ADD CONSTRAINT "EmailLink_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLink" ADD CONSTRAINT "EmailLink_linked_by_fkey" FOREIGN KEY ("linked_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
