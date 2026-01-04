-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "password_reset_token_expires_at" TIMESTAMP(3),
ADD COLUMN     "password_reset_token_hash" TEXT;
