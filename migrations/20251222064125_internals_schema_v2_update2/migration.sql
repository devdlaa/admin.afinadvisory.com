/*
  Warnings:

  - A unique constraint covering the columns `[user_code]` on the table `AdminUser` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `AdminUser` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `address_line1` to the `AdminUser` table without a default value. This is not possible if the table is not empty.
  - Added the required column `city` to the `AdminUser` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `AdminUser` table without a default value. This is not possible if the table is not empty.
  - Added the required column `state` to the `AdminUser` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_code` to the `AdminUser` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AdminUserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "address_line1" CHAR(200) NOT NULL,
ADD COLUMN     "address_line2" CHAR(200),
ADD COLUMN     "alternate_phone" TEXT,
ADD COLUMN     "city" CHAR(50) NOT NULL,
ADD COLUMN     "date_of_joining" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "pincode" CHAR(6),
ADD COLUMN     "state" "IndianState" NOT NULL,
ADD COLUMN     "status" "AdminUserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "two_fa_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "two_fa_secret" TEXT,
ADD COLUMN     "two_fa_verified_at" TIMESTAMP(3),
ADD COLUMN     "user_code" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "admin_user_counter" (
    "id" UUID NOT NULL,
    "current_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_user_counter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_user_code_key" ON "AdminUser"("user_code");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_phone_key" ON "AdminUser"("phone");

-- CreateIndex
CREATE INDEX "AdminUser_user_code_idx" ON "AdminUser"("user_code");

-- CreateIndex
CREATE INDEX "AdminUser_phone_idx" ON "AdminUser"("phone");

-- CreateIndex
CREATE INDEX "AdminUser_status_idx" ON "AdminUser"("status");
