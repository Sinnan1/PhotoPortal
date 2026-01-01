-- CreateTable
CREATE TABLE "public"."user_presence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "galleryId" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "browser" TEXT,
    "browserVersion" TEXT,
    "os" TEXT,
    "deviceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_presence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_presence_userId_key" ON "public"."user_presence"("userId");

-- CreateIndex
CREATE INDEX "user_presence_lastSeenAt_idx" ON "public"."user_presence"("lastSeenAt");

-- AddForeignKey
ALTER TABLE "public"."user_presence" ADD CONSTRAINT "user_presence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_presence" ADD CONSTRAINT "user_presence_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "public"."galleries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
