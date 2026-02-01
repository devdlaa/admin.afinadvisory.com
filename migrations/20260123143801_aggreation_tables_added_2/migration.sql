-- AddForeignKey
ALTER TABLE "reconcile_stats_current" ADD CONSTRAINT "reconcile_stats_current_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
