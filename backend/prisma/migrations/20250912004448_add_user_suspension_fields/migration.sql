-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedBy" TEXT,
ADD COLUMN     "suspensionReason" TEXT;
