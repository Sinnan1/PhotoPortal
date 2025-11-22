-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "feedbackRequestActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "feedbackRequestedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."client_feedback" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "photographerId" TEXT NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "selectionProcessRating" INTEGER NOT NULL,
    "portalExperienceRating" INTEGER NOT NULL,
    "comments" TEXT,
    "wouldRecommend" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_feedback_photographerId_idx" ON "public"."client_feedback"("photographerId");

-- CreateIndex
CREATE INDEX "client_feedback_createdAt_idx" ON "public"."client_feedback"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "client_feedback_clientId_photographerId_key" ON "public"."client_feedback"("clientId", "photographerId");

-- AddForeignKey
ALTER TABLE "public"."client_feedback" ADD CONSTRAINT "client_feedback_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
