/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `Influencer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `Influencer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[primary_email]` on the table `LeadContact` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[primary_phone]` on the table `LeadContact` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pan]` on the table `LeadContact` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[gst_number]` on the table `LeadContact` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "LeadPipelineStage" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT;

-- CreateTable
CREATE TABLE "LeadStageBulkOperation" (
    "id" UUID NOT NULL,
    "pipeline_id" UUID NOT NULL,
    "from_stage_id" UUID,
    "to_stage_id" UUID NOT NULL,
    "total_leads" INTEGER NOT NULL,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "LeadStageBulkOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadStageBulkOperation_pipeline_id_idx" ON "LeadStageBulkOperation"("pipeline_id");

-- CreateIndex
CREATE INDEX "LeadStageBulkOperation_changed_at_idx" ON "LeadStageBulkOperation"("changed_at");

-- CreateIndex
CREATE UNIQUE INDEX "Influencer_phone_key" ON "Influencer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Influencer_email_key" ON "Influencer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LeadContact_primary_email_key" ON "LeadContact"("primary_email");

-- CreateIndex
CREATE UNIQUE INDEX "LeadContact_primary_phone_key" ON "LeadContact"("primary_phone");

-- CreateIndex
CREATE UNIQUE INDEX "LeadContact_pan_key" ON "LeadContact"("pan");

-- CreateIndex
CREATE UNIQUE INDEX "LeadContact_gst_number_key" ON "LeadContact"("gst_number");

-- AddForeignKey
ALTER TABLE "LeadStageBulkOperation" ADD CONSTRAINT "LeadStageBulkOperation_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "LeadPipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStageBulkOperation" ADD CONSTRAINT "LeadStageBulkOperation_from_stage_id_fkey" FOREIGN KEY ("from_stage_id") REFERENCES "LeadPipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStageBulkOperation" ADD CONSTRAINT "LeadStageBulkOperation_to_stage_id_fkey" FOREIGN KEY ("to_stage_id") REFERENCES "LeadPipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStageBulkOperation" ADD CONSTRAINT "LeadStageBulkOperation_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
