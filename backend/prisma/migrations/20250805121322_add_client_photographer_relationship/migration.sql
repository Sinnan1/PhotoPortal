-- AlterTable
ALTER TABLE "public"."galleries" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "photographerId" TEXT;

-- CreateTable
CREATE TABLE "public"."gallery_access" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canDownload" BOOLEAN NOT NULL DEFAULT true,
    "canLike" BOOLEAN NOT NULL DEFAULT true,
    "canFavorite" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gallery_access_userId_galleryId_key" ON "public"."gallery_access"("userId", "galleryId");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_photographerId_fkey" FOREIGN KEY ("photographerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gallery_access" ADD CONSTRAINT "gallery_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gallery_access" ADD CONSTRAINT "gallery_access_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "public"."galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
