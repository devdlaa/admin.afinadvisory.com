-- AlterEnum
ALTER TYPE "LeadActivityStatus" ADD VALUE 'CANCELLED';

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
