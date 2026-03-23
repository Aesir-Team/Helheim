-- CreateEnum
CREATE TYPE "ExternalSourceProvider" AS ENUM ('NEXUSTOONS', 'MANGADEX', 'CUSTOM_A', 'CUSTOM_B');

-- CreateTable
CREATE TABLE "manga_external_sources" (
    "id" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "provider" "ExternalSourceProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" "MangaSyncStatus" NOT NULL DEFAULT 'idle',
    "lastSyncError" TEXT,

    CONSTRAINT "manga_external_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manga_external_sources_mangaId_provider_key" ON "manga_external_sources"("mangaId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "manga_external_sources_provider_externalId_key" ON "manga_external_sources"("provider", "externalId");

-- CreateIndex
CREATE INDEX "manga_external_sources_mangaId_idx" ON "manga_external_sources"("mangaId");

-- CreateIndex
CREATE INDEX "manga_external_sources_mangaId_priority_idx" ON "manga_external_sources"("mangaId", "priority");

-- AddForeignKey
ALTER TABLE "manga_external_sources" ADD CONSTRAINT "manga_external_sources_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "mangas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
