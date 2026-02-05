/*
  Warnings:

  - The values [UNREGISTERED_INDIVIDUAL] on the enum `EntityType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EntityType_new" AS ENUM ('INDIVIDUAL', 'UN_REGISTRED', 'PRIVATE_LIMITED_COMPANY', 'PUBLIC_LIMITED_COMPANY', 'ONE_PERSON_COMPANY', 'SECTION_8_COMPANY', 'PRODUCER_COMPANY', 'SOLE_PROPRIETORSHIP', 'PARTNERSHIP_FIRM', 'LIMITED_LIABILITY_PARTNERSHIP', 'TRUST', 'SOCIETY', 'COOPERATIVE_SOCIETY', 'FOREIGN_COMPANY', 'GOVERNMENT_COMPANY', 'ASSOCIATION_OF_PERSON', 'HUF');
ALTER TABLE "Entity" ALTER COLUMN "entity_type" TYPE "EntityType_new" USING ("entity_type"::text::"EntityType_new");
ALTER TYPE "EntityType" RENAME TO "EntityType_old";
ALTER TYPE "EntityType_new" RENAME TO "EntityType";
DROP TYPE "public"."EntityType_old";
COMMIT;
