/*
  Warnings:

  - You are about to drop the column `isPublic` on the `galleries` table. All the data in the column will be lost.
  - The primary key for the `gallery_access` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `canDownload` on the `gallery_access` table. All the data in the column will be lost.
  - You are about to drop the column `canFavorite` on the `gallery_access` table. All the data in the column will be lost.
  - You are about to drop the column `canLike` on the `gallery_access` table. All the data in the column will be lost.
  - You are about to drop the column `canView` on the `gallery_access` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `gallery_access` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `gallery_access` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `gallery_access` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_photographerId_fkey";

-- DropIndex
DROP INDEX "public"."gallery_access_userId_galleryId_key";

-- AlterTable
ALTER TABLE "public"."galleries" DROP COLUMN "isPublic";

-- AlterTable
ALTER TABLE "public"."gallery_access" DROP CONSTRAINT "gallery_access_pkey",
DROP COLUMN "canDownload",
DROP COLUMN "canFavorite",
DROP COLUMN "canLike",
DROP COLUMN "canView",
DROP COLUMN "expiresAt",
DROP COLUMN "id",
DROP COLUMN "updatedAt",
ADD CONSTRAINT "gallery_access_pkey" PRIMARY KEY ("userId", "galleryId");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_photographerId_fkey" FOREIGN KEY ("photographerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
