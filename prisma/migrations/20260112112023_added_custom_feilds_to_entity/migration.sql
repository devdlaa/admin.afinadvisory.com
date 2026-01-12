-- CreateTable
CREATE TABLE "EntityCustomField" (
    "id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "value" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntityCustomField_entity_id_idx" ON "EntityCustomField"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "EntityCustomField_entity_id_name_key" ON "EntityCustomField"("entity_id", "name");

-- AddForeignKey
ALTER TABLE "EntityCustomField" ADD CONSTRAINT "EntityCustomField_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
