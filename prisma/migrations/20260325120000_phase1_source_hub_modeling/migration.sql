-- CreateEnum
CREATE TYPE "SourceOriginType" AS ENUM ('official', 'partner', 'external', 'user_connected', 'local_import');

-- AlterEnum (PostgreSQL 16+)
ALTER TYPE "ExternalSourceProvider" ADD VALUE IF NOT EXISTS 'MIDGARD';
ALTER TYPE "ExternalSourceProvider" ADD VALUE IF NOT EXISTS 'KOMGA';
ALTER TYPE "ExternalSourceProvider" ADD VALUE IF NOT EXISTS 'LOCAL_IMPORT';
ALTER TYPE "ExternalSourceProvider" ADD VALUE IF NOT EXISTS 'USER_EXTENSION';

-- DropIndex (substituídos por unique composto mais flexível)
DROP INDEX IF EXISTS "manga_external_sources_mangaId_provider_key";
DROP INDEX IF EXISTS "manga_external_sources_provider_externalId_key";

-- AlterTable
ALTER TABLE "manga_external_sources" ADD COLUMN     "originType" "SourceOriginType" NOT NULL DEFAULT 'external';
ALTER TABLE "manga_external_sources" ADD COLUMN     "isOfficial" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "manga_external_sources" ADD COLUMN     "isPublicEligible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "manga_external_sources" ADD COLUMN     "isFallbackEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "manga_external_sources" ADD COLUMN     "isUserScoped" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "manga_external_sources" ADD COLUMN     "ownerUserId" TEXT;
ALTER TABLE "manga_external_sources" ADD COLUMN     "ownerInstallationId" TEXT;
ALTER TABLE "manga_external_sources" ADD COLUMN     "sourceName" TEXT;
ALTER TABLE "manga_external_sources" ADD COLUMN     "sourceSlug" TEXT;
ALTER TABLE "manga_external_sources" ADD COLUMN     "healthScore" DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE "manga_external_sources" ADD COLUMN     "failureCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "manga_external_sources" ADD COLUMN     "lastSuccessAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "manga_external_sources_mangaId_provider_externalId_key" ON "manga_external_sources"("mangaId", "provider", "externalId");

-- CreateIndex
CREATE INDEX "manga_external_sources_isUserScoped_idx" ON "manga_external_sources"("isUserScoped");
CREATE INDEX "manga_external_sources_ownerUserId_idx" ON "manga_external_sources"("ownerUserId");
CREATE INDEX "manga_external_sources_ownerInstallationId_idx" ON "manga_external_sources"("ownerInstallationId");

-- AddForeignKey
ALTER TABLE "manga_external_sources" ADD CONSTRAINT "manga_external_sources_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "mangas" ADD COLUMN "preferredSourceId" TEXT;

-- CreateIndex
CREATE INDEX "mangas_preferredSourceId_idx" ON "mangas"("preferredSourceId");

-- AddForeignKey
ALTER TABLE "mangas" ADD CONSTRAINT "mangas_preferredSourceId_fkey" FOREIGN KEY ("preferredSourceId") REFERENCES "manga_external_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "user_manga_source_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_manga_source_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_manga_source_preferences_userId_mangaId_key" ON "user_manga_source_preferences"("userId", "mangaId");

-- CreateIndex
CREATE INDEX "user_manga_source_preferences_userId_idx" ON "user_manga_source_preferences"("userId");

-- CreateIndex
CREATE INDEX "user_manga_source_preferences_mangaId_idx" ON "user_manga_source_preferences"("mangaId");

-- CreateIndex
CREATE INDEX "user_manga_source_preferences_sourceId_idx" ON "user_manga_source_preferences"("sourceId");

-- AddForeignKey
ALTER TABLE "user_manga_source_preferences" ADD CONSTRAINT "user_manga_source_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_manga_source_preferences" ADD CONSTRAINT "user_manga_source_preferences_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "mangas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_manga_source_preferences" ADD CONSTRAINT "user_manga_source_preferences_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "manga_external_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
