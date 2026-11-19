-- CreateTable
CREATE TABLE "GuestSession" (
    "id" UUID NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestSession_sessionTokenHash_key" ON "GuestSession"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "GuestSession_guestId_idx" ON "GuestSession"("guestId");

-- AddForeignKey
ALTER TABLE "GuestSession" ADD CONSTRAINT "GuestSession_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
