/*
  Warnings:

  - You are about to drop the column `description` on the `LeadTag` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[normalized_name]` on the table `LeadTag` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `normalized_name` to the `LeadTag` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "task_search_vector_gin";

-- DropIndex
DROP INDEX "task_title_vector_gin";

-- AlterTable
ALTER TABLE "LeadTag" DROP COLUMN "description",
ADD COLUMN     "normalized_name" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LeadTag_normalized_name_key" ON "LeadTag"("normalized_name");
