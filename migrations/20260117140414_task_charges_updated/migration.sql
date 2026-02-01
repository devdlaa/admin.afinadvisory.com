-- AlterTable
ALTER TABLE "TaskCharge" ADD COLUMN     "restored_by" UUID;

-- AddForeignKey
ALTER TABLE "TaskCharge" ADD CONSTRAINT "TaskCharge_restored_by_fkey" FOREIGN KEY ("restored_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
