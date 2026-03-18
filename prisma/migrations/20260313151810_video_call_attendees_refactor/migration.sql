/*
  Warnings:

  - A unique constraint covering the columns `[google_event_id]` on the table `VideoCall` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "VideoCallAttendeeType" AS ENUM ('EMPLOYEE', 'ENTITY', 'LEAD_CONTACT', 'EXTERNAL');


-- AlterTable
ALTER TABLE "VideoCall" ADD COLUMN     "entity_id" UUID,
ADD COLUMN     "google_event_id" TEXT,
ADD COLUMN     "google_meet_code" TEXT,
ADD COLUMN     "google_meet_link" TEXT,
ADD COLUMN     "google_synced_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "VideoCallAttendee" (
    "id" UUID NOT NULL,
    "video_call_id" UUID NOT NULL,
    "attendee_type" "VideoCallAttendeeType" NOT NULL,
    "admin_user_id" UUID,
    "entity_id" UUID,
    "lead_contact_id" UUID,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "joined_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),

    CONSTRAINT "VideoCallAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoCallAttendee_video_call_id_idx" ON "VideoCallAttendee"("video_call_id");

-- CreateIndex
CREATE UNIQUE INDEX "VideoCall_google_event_id_key" ON "VideoCall"("google_event_id");

-- CreateIndex
CREATE INDEX "VideoCall_entity_id_idx" ON "VideoCall"("entity_id");

-- AddForeignKey
ALTER TABLE "VideoCall" ADD CONSTRAINT "VideoCall_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoCallAttendee" ADD CONSTRAINT "VideoCallAttendee_video_call_id_fkey" FOREIGN KEY ("video_call_id") REFERENCES "VideoCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoCallAttendee" ADD CONSTRAINT "VideoCallAttendee_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoCallAttendee" ADD CONSTRAINT "VideoCallAttendee_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoCallAttendee" ADD CONSTRAINT "VideoCallAttendee_lead_contact_id_fkey" FOREIGN KEY ("lead_contact_id") REFERENCES "LeadContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
