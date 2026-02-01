/*
  Warnings:

  - Added the required column `created_by` to the `TaskCharge` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_by` to the `TaskCharge` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TaskCharge" ADD COLUMN     "created_by" UUID NOT NULL,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" UUID,
ADD COLUMN     "updated_by" UUID NOT NULL;

-- AlterTable
ALTER TABLE "TaskChecklistItem" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" UUID;

-- CreateIndex
CREATE INDEX "TaskCharge_deleted_at_idx" ON "TaskCharge"("deleted_at");

-- CreateIndex
CREATE INDEX "TaskChecklistItem_created_by_idx" ON "TaskChecklistItem"("created_by");

-- CreateIndex
CREATE INDEX "TaskChecklistItem_updated_by_idx" ON "TaskChecklistItem"("updated_by");

-- CreateIndex
CREATE INDEX "TaskChecklistItem_deleted_by_idx" ON "TaskChecklistItem"("deleted_by");

-- AddForeignKey
ALTER TABLE "TaskCharge" ADD CONSTRAINT "TaskCharge_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCharge" ADD CONSTRAINT "TaskCharge_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCharge" ADD CONSTRAINT "TaskCharge_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChecklistItem" ADD CONSTRAINT "TaskChecklistItem_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChecklistItem" ADD CONSTRAINT "TaskChecklistItem_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskChecklistItem" ADD CONSTRAINT "TaskChecklistItem_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
