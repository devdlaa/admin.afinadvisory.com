/*
  Warnings:

  - The primary key for the `admin_user_counter` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "admin_user_counter" DROP CONSTRAINT "admin_user_counter_pkey",
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "admin_user_counter_pkey" PRIMARY KEY ("id");
