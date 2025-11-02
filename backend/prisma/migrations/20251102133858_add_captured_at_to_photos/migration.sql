-- AlterTable
ALTER TABLE "public"."photos" ADD COLUMN     "capturedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "photos_capturedAt_idx" ON "public"."photos"("capturedAt");
