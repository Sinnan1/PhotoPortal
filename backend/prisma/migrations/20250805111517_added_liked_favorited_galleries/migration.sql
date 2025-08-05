-- CreateTable
CREATE TABLE "public"."liked_photos" (
    "userId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liked_photos_pkey" PRIMARY KEY ("userId","photoId")
);

-- CreateTable
CREATE TABLE "public"."favorited_photos" (
    "userId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorited_photos_pkey" PRIMARY KEY ("userId","photoId")
);

-- CreateTable
CREATE TABLE "public"."liked_galleries" (
    "userId" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liked_galleries_pkey" PRIMARY KEY ("userId","galleryId")
);

-- CreateTable
CREATE TABLE "public"."favorited_galleries" (
    "userId" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorited_galleries_pkey" PRIMARY KEY ("userId","galleryId")
);

-- AddForeignKey
ALTER TABLE "public"."liked_photos" ADD CONSTRAINT "liked_photos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."liked_photos" ADD CONSTRAINT "liked_photos_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "public"."photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."favorited_photos" ADD CONSTRAINT "favorited_photos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."favorited_photos" ADD CONSTRAINT "favorited_photos_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "public"."photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."liked_galleries" ADD CONSTRAINT "liked_galleries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."liked_galleries" ADD CONSTRAINT "liked_galleries_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "public"."galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."favorited_galleries" ADD CONSTRAINT "favorited_galleries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."favorited_galleries" ADD CONSTRAINT "favorited_galleries_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "public"."galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
