-- AlterTable
ALTER TABLE "public"."galleries" ADD COLUMN     "shootDate" TIMESTAMP(3),
ADD COLUMN     "shootMonth" INTEGER,
ADD COLUMN     "shootYear" INTEGER;

-- CreateIndex
CREATE INDEX "galleries_photographerId_shootYear_shootMonth_idx" ON "public"."galleries"("photographerId", "shootYear", "shootMonth");

-- CreateIndex
CREATE INDEX "galleries_photographerId_shootDate_idx" ON "public"."galleries"("photographerId", "shootDate");
