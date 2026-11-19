-- CreateTable
CREATE TABLE "WorldSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "eventTitle" TEXT NOT NULL DEFAULT 'Graduation World',
    "eventDate" TIMESTAMP(3),
    "eventDescription" TEXT,
    "welcomeMessage" TEXT,
    "worldName" TEXT NOT NULL DEFAULT 'Graduation World',
    "musicUrl" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'night',
    "announcement" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldSettings_pkey" PRIMARY KEY ("id")
);
