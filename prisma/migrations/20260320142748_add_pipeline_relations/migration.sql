-- AddForeignKey
ALTER TABLE "LeadPipeline" ADD CONSTRAINT "LeadPipeline_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
