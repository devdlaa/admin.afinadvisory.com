-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "last_activity_at" TIMESTAMP(3),
ADD COLUMN     "last_activity_by" UUID;
