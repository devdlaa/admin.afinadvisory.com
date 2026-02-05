-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "is_2fa_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboarding_token_expires_at" TIMESTAMP(3);
