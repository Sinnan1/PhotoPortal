-- AlterTable
ALTER TABLE "public"."galleries" ADD COLUMN     "selectionLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "selectionLockedAt" TIMESTAMP(3);
