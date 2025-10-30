-- CreateEnum
CREATE TYPE "public"."ThumbnailStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."UploadStatus" AS ENUM ('UPLOADING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."UploadSessionStatus" AS ENUM ('IN_PROGRESS', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."photos" ADD COLUMN     "thumbnailStatus" "public"."ThumbnailStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "uploadSessionId" TEXT,
ADD COLUMN     "uploadStatus" "public"."UploadStatus" NOT NULL DEFAULT 'COMPLETED',
ALTER COLUMN "thumbnailUrl" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."upload_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "folderId" TEXT,
    "totalFiles" INTEGER NOT NULL,
    "uploadedFiles" INTEGER NOT NULL DEFAULT 0,
    "failedFiles" INTEGER NOT NULL DEFAULT 0,
    "totalBytes" BIGINT NOT NULL DEFAULT 0,
    "uploadedBytes" BIGINT NOT NULL DEFAULT 0,
    "status" "public"."UploadSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorMessage" TEXT,

    CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upload_sessions_userId_status_idx" ON "public"."upload_sessions"("userId", "status");

-- CreateIndex
CREATE INDEX "upload_sessions_galleryId_idx" ON "public"."upload_sessions"("galleryId");

-- CreateIndex
CREATE INDEX "upload_sessions_status_lastActivityAt_idx" ON "public"."upload_sessions"("status", "lastActivityAt");

-- CreateIndex
CREATE INDEX "photos_uploadSessionId_idx" ON "public"."photos"("uploadSessionId");

-- CreateIndex
CREATE INDEX "photos_thumbnailStatus_idx" ON "public"."photos"("thumbnailStatus");

-- CreateIndex
CREATE INDEX "photos_uploadStatus_idx" ON "public"."photos"("uploadStatus");

-- AddForeignKey
ALTER TABLE "public"."photos" ADD CONSTRAINT "photos_uploadSessionId_fkey" FOREIGN KEY ("uploadSessionId") REFERENCES "public"."upload_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."upload_sessions" ADD CONSTRAINT "upload_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."upload_sessions" ADD CONSTRAINT "upload_sessions_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "public"."galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
