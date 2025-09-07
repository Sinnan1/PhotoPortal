-- CreateTable
CREATE TABLE "public"."post_photos" (
    "userId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_photos_pkey" PRIMARY KEY ("userId","photoId")
);

-- AddForeignKey
ALTER TABLE "public"."post_photos" ADD CONSTRAINT "post_photos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."post_photos" ADD CONSTRAINT "post_photos_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "public"."photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
