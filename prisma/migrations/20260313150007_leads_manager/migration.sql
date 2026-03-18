-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('LINKEDIN', 'TWITTER', 'FACEBOOK', 'INSTAGRAM', 'YOUTUBE', 'OTHER');

-- CreateEnum
CREATE TYPE "IndustryType" AS ENUM ('ACCOMMODATION_SERVICES', 'ADMINISTRATIVE_SERVICES', 'CONSTRUCTION', 'CONSUMER_SERVICES', 'EDUCATION', 'ENTERTAINMENT', 'FARMING_FORESTRY', 'FINANCIAL_SERVICES', 'GOVERNMENT', 'HOLDING_COMPANY', 'HEALTHCARE', 'MANUFACTURING', 'OIL_GAS_MINING', 'PROFESSIONAL_SERVICES', 'REAL_ESTATE', 'RETAIL', 'TECHNOLOGY', 'TRANSPORT_LOGISTICS', 'UTILITIES', 'OTHER');

-- CreateEnum
CREATE TYPE "PreferredLanguage" AS ENUM ('ENGLISH', 'HINDI', 'MARATHI', 'GUJARATI', 'TAMIL', 'TELUGU', 'BENGALI', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('MANUAL', 'WEBSITE_FORM', 'FACEBOOK_AD', 'INSTAGRAM_AD', 'GOOGLE_AD', 'YOUTUBE_AD', 'WHATSAPP', 'REFERRAL', 'EVENT', 'COLD_CALL', 'PARTNER', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadReferenceType" AS ENUM ('INFLUENCER', 'ENTITY', 'EXTERNAL_PERSON');

-- CreateEnum
CREATE TYPE "LeadActivityType" AS ENUM ('CALL', 'EMAIL', 'WHATSAPP', 'VIDEO_CALL', 'PROPOSAL_SENT');

-- CreateEnum
CREATE TYPE "LeadActivityStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActivityMissedBy" AS ENUM ('USER', 'CLIENT');

-- CreateEnum
CREATE TYPE "VideoCallStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeadAssignmentRole" AS ENUM ('OWNER', 'COLLABORATOR');

-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- AlterEnum
ALTER TYPE "DocumentScope" ADD VALUE 'LEAD_ACTIVITY';







-- CreateTable
CREATE TABLE "LeadContact" (
    "id" UUID NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "contact_person" VARCHAR(120),
    "company_name" VARCHAR(150),
    "designation" VARCHAR(120),
    "primary_email" VARCHAR(150),
    "secondary_email" VARCHAR(150),
    "primary_phone" VARCHAR(20),
    "primary_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "secondary_phone" VARCHAR(20),
    "secondary_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "website" VARCHAR(200),
    "industry" "IndustryType",
    "pan" CHAR(10),
    "gst_number" VARCHAR(15),
    "preferred_language" "PreferredLanguage",
    "address_line1" VARCHAR(200),
    "address_line2" VARCHAR(200),
    "country_code" CHAR(2),
    "state_code" VARCHAR(10),
    "city" VARCHAR(80),
    "pincode" VARCHAR(15),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "LeadContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadContactSocialLink" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "url" VARCHAR(300) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadContactSocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadTag" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "color" VARCHAR(20),
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "LeadTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadTagMap" (
    "lead_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "LeadTagMap_pkey" PRIMARY KEY ("lead_id","tag_id")
);

-- CreateTable
CREATE TABLE "LeadSourceData" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "source" "LeadSource" NOT NULL,
    "external_id" VARCHAR(150),
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "raw_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadSourceData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadReference" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "type" "LeadReferenceType" NOT NULL,
    "influencer_id" UUID,
    "entity_id" UUID,
    "name" VARCHAR(120),
    "phone" VARCHAR(20),
    "email" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "activity_type" "LeadActivityType" NOT NULL,
    "status" "LeadActivityStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" VARCHAR(200),
    "description" TEXT,
    "is_scheduled" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "completion_note" TEXT,
    "missed_reason" TEXT,
    "missed_by" "ActivityMissedBy",
    "video_call_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "closed_by" UUID,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoCall" (
    "id" UUID NOT NULL,
    "meeting_link" VARCHAR(500) NOT NULL,
    "meeting_code" VARCHAR(120),
    "title" VARCHAR(200),
    "description" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "status" "VideoCallStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAssignment" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "role" "LeadAssignmentRole" NOT NULL DEFAULT 'COLLABORATOR',
    "assigned_by" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadStageHistory" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "from_stage_id" UUID,
    "to_stage_id" UUID NOT NULL,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "LeadStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" UUID NOT NULL,
    "lead_contact_id" UUID NOT NULL,
    "company_profile_id" UUID NOT NULL,
    "pipeline_id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "source" "LeadSource" NOT NULL,
    "priority" "LeadPriority" NOT NULL DEFAULT 'NORMAL',
    "expected_close_date" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3),
    "next_activity_at" TIMESTAMP(3),
    "stage_updated_at" TIMESTAMP(3),
    "stage_updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,
    "lost_reason" TEXT,
    "lost_note" TEXT,
    "lost_at" TIMESTAMP(3),
    "lost_by" UUID,
    "won_at" TIMESTAMP(3),
    "won_by" UUID,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadPipeline" (
    "id" UUID NOT NULL,
    "company_profile_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "LeadPipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadPipelineStage" (
    "id" UUID NOT NULL,
    "pipeline_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "stage_order" INTEGER NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "is_won" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadPipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadService" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "LeadService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadServiceInterest" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadServiceInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Influencer" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "Influencer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfluencerSocialLink" (
    "id" UUID NOT NULL,
    "influencer_id" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "url" VARCHAR(300) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfluencerSocialLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadOutgoingEmailAccount" (
    "id" UUID NOT NULL,
    "company_profile_id" UUID NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "display_name" VARCHAR(150),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadOutgoingEmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadEmailMessage" (
    "id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "from_account_id" UUID NOT NULL,
    "to_email" VARCHAR(150) NOT NULL,
    "subject" VARCHAR(300) NOT NULL,
    "body" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadEmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadEmailAttachment" (
    "id" UUID NOT NULL,
    "email_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadEmailAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadContact_full_name_idx" ON "LeadContact"("full_name");

-- CreateIndex
CREATE INDEX "LeadContact_primary_email_idx" ON "LeadContact"("primary_email");

-- CreateIndex
CREATE INDEX "LeadContact_primary_phone_idx" ON "LeadContact"("primary_phone");

-- CreateIndex
CREATE INDEX "LeadContact_company_name_idx" ON "LeadContact"("company_name");

-- CreateIndex
CREATE INDEX "LeadContact_industry_idx" ON "LeadContact"("industry");

-- CreateIndex
CREATE INDEX "LeadContact_country_code_state_code_idx" ON "LeadContact"("country_code", "state_code");

-- CreateIndex
CREATE INDEX "LeadContactSocialLink_contact_id_idx" ON "LeadContactSocialLink"("contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "LeadTag_name_key" ON "LeadTag"("name");

-- CreateIndex
CREATE INDEX "LeadTag_name_idx" ON "LeadTag"("name");

-- CreateIndex
CREATE INDEX "LeadTagMap_lead_id_idx" ON "LeadTagMap"("lead_id");

-- CreateIndex
CREATE INDEX "LeadTagMap_tag_id_idx" ON "LeadTagMap"("tag_id");

-- CreateIndex
CREATE INDEX "LeadSourceData_source_idx" ON "LeadSourceData"("source");

-- CreateIndex
CREATE INDEX "LeadSourceData_external_id_idx" ON "LeadSourceData"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "LeadSourceData_lead_id_key" ON "LeadSourceData"("lead_id");

-- CreateIndex
CREATE INDEX "LeadReference_influencer_id_idx" ON "LeadReference"("influencer_id");

-- CreateIndex
CREATE INDEX "LeadReference_entity_id_idx" ON "LeadReference"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "LeadReference_lead_id_key" ON "LeadReference"("lead_id");

-- CreateIndex
CREATE INDEX "LeadActivity_lead_id_idx" ON "LeadActivity"("lead_id");

-- CreateIndex
CREATE INDEX "LeadActivity_lead_id_status_idx" ON "LeadActivity"("lead_id", "status");

-- CreateIndex
CREATE INDEX "LeadActivity_status_idx" ON "LeadActivity"("status");

-- CreateIndex
CREATE INDEX "LeadActivity_scheduled_at_idx" ON "LeadActivity"("scheduled_at");

-- CreateIndex
CREATE INDEX "LeadActivity_status_scheduled_at_idx" ON "LeadActivity"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "LeadActivity_created_at_idx" ON "LeadActivity"("created_at");

-- CreateIndex
CREATE INDEX "VideoCall_status_idx" ON "VideoCall"("status");

-- CreateIndex
CREATE INDEX "VideoCall_start_time_idx" ON "VideoCall"("start_time");

-- CreateIndex
CREATE INDEX "VideoCall_created_at_idx" ON "VideoCall"("created_at");

-- CreateIndex
CREATE INDEX "LeadAssignment_lead_id_idx" ON "LeadAssignment"("lead_id");

-- CreateIndex
CREATE INDEX "LeadAssignment_admin_user_id_idx" ON "LeadAssignment"("admin_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "LeadAssignment_lead_id_admin_user_id_key" ON "LeadAssignment"("lead_id", "admin_user_id");

-- CreateIndex
CREATE INDEX "LeadStageHistory_lead_id_idx" ON "LeadStageHistory"("lead_id");

-- CreateIndex
CREATE INDEX "LeadStageHistory_changed_at_idx" ON "LeadStageHistory"("changed_at");

-- CreateIndex
CREATE INDEX "Lead_pipeline_id_idx" ON "Lead"("pipeline_id");

-- CreateIndex
CREATE INDEX "Lead_stage_id_idx" ON "Lead"("stage_id");

-- CreateIndex
CREATE INDEX "Lead_expected_close_date_idx" ON "Lead"("expected_close_date");

-- CreateIndex
CREATE INDEX "Lead_next_activity_at_idx" ON "Lead"("next_activity_at");

-- CreateIndex
CREATE INDEX "Lead_created_at_idx" ON "Lead"("created_at");

-- CreateIndex
CREATE INDEX "Lead_deleted_at_idx" ON "Lead"("deleted_at");

-- CreateIndex
CREATE INDEX "LeadPipeline_company_profile_id_idx" ON "LeadPipeline"("company_profile_id");

-- CreateIndex
CREATE INDEX "LeadPipelineStage_pipeline_id_idx" ON "LeadPipelineStage"("pipeline_id");

-- CreateIndex
CREATE INDEX "LeadPipelineStage_pipeline_id_stage_order_idx" ON "LeadPipelineStage"("pipeline_id", "stage_order");

-- CreateIndex
CREATE UNIQUE INDEX "LeadPipelineStage_pipeline_id_name_key" ON "LeadPipelineStage"("pipeline_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "LeadService_name_key" ON "LeadService"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LeadServiceInterest_lead_id_service_id_key" ON "LeadServiceInterest"("lead_id", "service_id");

-- CreateIndex
CREATE INDEX "Influencer_name_idx" ON "Influencer"("name");

-- CreateIndex
CREATE INDEX "Influencer_phone_idx" ON "Influencer"("phone");

-- CreateIndex
CREATE INDEX "Influencer_deleted_at_idx" ON "Influencer"("deleted_at");

-- CreateIndex
CREATE INDEX "InfluencerSocialLink_influencer_id_idx" ON "InfluencerSocialLink"("influencer_id");

-- CreateIndex
CREATE UNIQUE INDEX "LeadOutgoingEmailAccount_email_key" ON "LeadOutgoingEmailAccount"("email");

-- CreateIndex
CREATE INDEX "LeadOutgoingEmailAccount_company_profile_id_idx" ON "LeadOutgoingEmailAccount"("company_profile_id");

-- CreateIndex
CREATE INDEX "LeadEmailMessage_scheduled_at_idx" ON "LeadEmailMessage"("scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "LeadEmailMessage_activity_id_key" ON "LeadEmailMessage"("activity_id");

-- CreateIndex
CREATE INDEX "LeadEmailAttachment_document_id_idx" ON "LeadEmailAttachment"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "LeadEmailAttachment_email_id_document_id_key" ON "LeadEmailAttachment"("email_id", "document_id");

-- AddForeignKey
ALTER TABLE "LeadContact" ADD CONSTRAINT "LeadContact_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadContact" ADD CONSTRAINT "LeadContact_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadContactSocialLink" ADD CONSTRAINT "LeadContactSocialLink_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "LeadContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTag" ADD CONSTRAINT "LeadTag_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTagMap" ADD CONSTRAINT "LeadTagMap_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadTagMap" ADD CONSTRAINT "LeadTagMap_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "LeadTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadSourceData" ADD CONSTRAINT "LeadSourceData_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadReference" ADD CONSTRAINT "LeadReference_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadReference" ADD CONSTRAINT "LeadReference_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "Influencer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadReference" ADD CONSTRAINT "LeadReference_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_video_call_id_fkey" FOREIGN KEY ("video_call_id") REFERENCES "VideoCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoCall" ADD CONSTRAINT "VideoCall_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStageHistory" ADD CONSTRAINT "LeadStageHistory_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStageHistory" ADD CONSTRAINT "LeadStageHistory_from_stage_id_fkey" FOREIGN KEY ("from_stage_id") REFERENCES "LeadPipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStageHistory" ADD CONSTRAINT "LeadStageHistory_to_stage_id_fkey" FOREIGN KEY ("to_stage_id") REFERENCES "LeadPipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStageHistory" ADD CONSTRAINT "LeadStageHistory_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_lead_contact_id_fkey" FOREIGN KEY ("lead_contact_id") REFERENCES "LeadContact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_company_profile_id_fkey" FOREIGN KEY ("company_profile_id") REFERENCES "CompanyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "LeadPipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "LeadPipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_lost_by_fkey" FOREIGN KEY ("lost_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_won_by_fkey" FOREIGN KEY ("won_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadPipeline" ADD CONSTRAINT "LeadPipeline_company_profile_id_fkey" FOREIGN KEY ("company_profile_id") REFERENCES "CompanyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadPipeline" ADD CONSTRAINT "LeadPipeline_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadPipelineStage" ADD CONSTRAINT "LeadPipelineStage_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "LeadPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadServiceInterest" ADD CONSTRAINT "LeadServiceInterest_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadServiceInterest" ADD CONSTRAINT "LeadServiceInterest_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "LeadService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerSocialLink" ADD CONSTRAINT "InfluencerSocialLink_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadOutgoingEmailAccount" ADD CONSTRAINT "LeadOutgoingEmailAccount_company_profile_id_fkey" FOREIGN KEY ("company_profile_id") REFERENCES "CompanyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEmailMessage" ADD CONSTRAINT "LeadEmailMessage_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "LeadActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEmailMessage" ADD CONSTRAINT "LeadEmailMessage_from_account_id_fkey" FOREIGN KEY ("from_account_id") REFERENCES "LeadOutgoingEmailAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEmailAttachment" ADD CONSTRAINT "LeadEmailAttachment_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "LeadEmailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadEmailAttachment" ADD CONSTRAINT "LeadEmailAttachment_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
