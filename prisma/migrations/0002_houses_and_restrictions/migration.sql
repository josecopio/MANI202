-- AlterEnum
ALTER TYPE "Audience" ADD VALUE 'HOUSE_ONLY';

-- CreateEnum
CREATE TYPE "SpaceImpact" AS ENUM ('NONE', 'LIMITED', 'CLOSED');

-- CreateTable
CREATE TABLE "House" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "isResidence" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "House_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN "houseId" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "houseId" TEXT,
ADD COLUMN "spaceImpact" "SpaceImpact" NOT NULL DEFAULT 'NONE',
ADD COLUMN "restrictionNote" TEXT;

-- AlterTable
ALTER TABLE "Subscriber" ADD COLUMN "houseSlugs" TEXT NOT NULL DEFAULT '',
ADD COLUMN "homeSlug" TEXT NOT NULL DEFAULT '',
ADD COLUMN "categorySlugs" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "House_slug_key" ON "House"("slug");

-- CreateIndex
CREATE INDEX "Venue_houseId_idx" ON "Venue"("houseId");

-- CreateIndex
CREATE INDEX "Event_houseId_idx" ON "Event"("houseId");

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
