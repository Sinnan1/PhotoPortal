-- AlterTable
ALTER TABLE "public"."galleries" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "public"."gallery_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverPhotoId" TEXT,
    "shootDate" TIMESTAMP(3),
    "shootYear" INTEGER,
    "shootMonth" INTEGER,
    "photographerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gallery_groups_photographerId_shootYear_shootMonth_idx" ON "public"."gallery_groups"("photographerId", "shootYear", "shootMonth");

-- CreateIndex
CREATE INDEX "gallery_groups_photographerId_idx" ON "public"."gallery_groups"("photographerId");

-- CreateIndex
CREATE INDEX "galleries_groupId_idx" ON "public"."galleries"("groupId");

-- AddForeignKey
ALTER TABLE "public"."galleries" ADD CONSTRAINT "galleries_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."gallery_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gallery_groups" ADD CONSTRAINT "gallery_groups_photographerId_fkey" FOREIGN KEY ("photographerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gallery_groups" ADD CONSTRAINT "gallery_groups_coverPhotoId_fkey" FOREIGN KEY ("coverPhotoId") REFERENCES "public"."photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
