-- Partial index for active leads (most common query path)
CREATE INDEX idx_lead_pipeline_stage_active
ON "Lead"(pipeline_id, stage_id)
WHERE deleted_at IS NULL;