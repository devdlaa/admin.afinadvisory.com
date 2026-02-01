-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "last_onboarding_reset_request_at" TIMESTAMP(3),
ADD COLUMN     "onboarding_reset_token_expires_at" TIMESTAMP(3),
ADD COLUMN     "onboarding_reset_token_hash" TEXT;
