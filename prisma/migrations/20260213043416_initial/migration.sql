-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MODERATOR', 'VIP', 'USER');

-- CreateEnum
CREATE TYPE "MangaStatus" AS ENUM ('ongoing', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "MangaType" AS ENUM ('manga', 'manhwa', 'manhua');

-- CreateEnum
CREATE TYPE "MangaSyncStatus" AS ENUM ('idle', 'syncing', 'error');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('genre', 'theme');

-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('public', 'coin');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "CoinTransactionType" AS ENUM ('ad_reward', 'chapter_unlock', 'bonus', 'refund', 'admin_adjustment');

-- CreateEnum
CREATE TYPE "TakedownRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "coinsBalance" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "isNsfw" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mangas" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "alternativeTitles" TEXT,
    "description" TEXT,
    "coverImage" TEXT NOT NULL,
    "bannerImage" TEXT,
    "status" "MangaStatus" NOT NULL DEFAULT 'ongoing',
    "type" "MangaType" NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "releaseYear" INTEGER,
    "isNsfw" BOOLEAN NOT NULL DEFAULT false,
    "author" TEXT,
    "artist" TEXT,
    "officialLink" TEXT,
    "lastChapterAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "externalId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" "MangaSyncStatus" NOT NULL DEFAULT 'idle',
    "lastSyncError" TEXT,

    CONSTRAINT "mangas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manga_categories" (
    "mangaId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "manga_categories_pkey" PRIMARY KEY ("mangaId","categoryId")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "releaseStatus" "ReleaseStatus" NOT NULL DEFAULT 'published',
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'public',
    "coinCost" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "previousChapterId" TEXT,
    "nextChapterId" TEXT,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_pages" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "chapter_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "freeChaptersPerWeek" INTEGER,
    "priceInCents" INTEGER,
    "billingInterval" "BillingInterval",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "planNameAtSubscription" TEXT,
    "priceInCentsAtSubscription" INTEGER,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "amountInCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "externalPaymentId" TEXT,
    "externalPayerId" TEXT,
    "idempotencyKey" TEXT,
    "paidAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_chapter_week_access" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_chapter_week_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_chapter_coin_unlocks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "coinsSpent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_chapter_coin_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_reward_claims" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "coinsGranted" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_reward_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "CoinTransactionType" NOT NULL,
    "balanceAfter" INTEGER,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_manga_lists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "mangasReadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_manga_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_manga_list_items" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_manga_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL DEFAULT 1,
    "chaptersReadCount" INTEGER NOT NULL DEFAULT 0,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reading_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "takedown_requests" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "mangaId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "requesterDocument" TEXT,
    "declarationAccepted" BOOLEAN NOT NULL,
    "status" "TakedownRequestStatus" NOT NULL DEFAULT 'pending',
    "responseNote" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "takedown_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_id_idx" ON "users"("id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_type_idx" ON "categories"("type");

-- CreateIndex
CREATE UNIQUE INDEX "mangas_slug_key" ON "mangas"("slug");

-- CreateIndex
CREATE INDEX "mangas_slug_idx" ON "mangas"("slug");

-- CreateIndex
CREATE INDEX "mangas_status_idx" ON "mangas"("status");

-- CreateIndex
CREATE INDEX "mangas_type_idx" ON "mangas"("type");

-- CreateIndex
CREATE INDEX "mangas_lastChapterAt_idx" ON "mangas"("lastChapterAt");

-- CreateIndex
CREATE INDEX "mangas_isNsfw_idx" ON "mangas"("isNsfw");

-- CreateIndex
CREATE INDEX "mangas_lastSyncedAt_idx" ON "mangas"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "mangas_syncStatus_idx" ON "mangas"("syncStatus");

-- CreateIndex
CREATE INDEX "mangas_externalId_idx" ON "mangas"("externalId");

-- CreateIndex
CREATE INDEX "manga_categories_categoryId_idx" ON "manga_categories"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_previousChapterId_key" ON "chapters"("previousChapterId");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_nextChapterId_key" ON "chapters"("nextChapterId");

-- CreateIndex
CREATE INDEX "chapters_mangaId_idx" ON "chapters"("mangaId");

-- CreateIndex
CREATE INDEX "chapters_previousChapterId_idx" ON "chapters"("previousChapterId");

-- CreateIndex
CREATE INDEX "chapters_nextChapterId_idx" ON "chapters"("nextChapterId");

-- CreateIndex
CREATE INDEX "chapters_createdAt_idx" ON "chapters"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_mangaId_number_key" ON "chapters"("mangaId", "number");

-- CreateIndex
CREATE INDEX "chapter_pages_chapterId_idx" ON "chapter_pages"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "chapter_pages_chapterId_pageNumber_key" ON "chapter_pages"("chapterId", "pageNumber");

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE INDEX "plans_slug_idx" ON "plans"("slug");

-- CreateIndex
CREATE INDEX "plans_isActive_idx" ON "plans"("isActive");

-- CreateIndex
CREATE INDEX "subscriptions_userId_idx" ON "subscriptions"("userId");

-- CreateIndex
CREATE INDEX "subscriptions_planId_idx" ON "subscriptions"("planId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_expiresAt_idx" ON "subscriptions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotencyKey_key" ON "payments"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_subscriptionId_idx" ON "payments"("subscriptionId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_externalPaymentId_idx" ON "payments"("externalPaymentId");

-- CreateIndex
CREATE INDEX "user_chapter_week_access_userId_idx" ON "user_chapter_week_access"("userId");

-- CreateIndex
CREATE INDEX "user_chapter_week_access_userId_weekStart_idx" ON "user_chapter_week_access"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "user_chapter_week_access_userId_chapterId_weekStart_key" ON "user_chapter_week_access"("userId", "chapterId", "weekStart");

-- CreateIndex
CREATE INDEX "user_chapter_coin_unlocks_userId_idx" ON "user_chapter_coin_unlocks"("userId");

-- CreateIndex
CREATE INDEX "user_chapter_coin_unlocks_chapterId_idx" ON "user_chapter_coin_unlocks"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "user_chapter_coin_unlocks_userId_chapterId_key" ON "user_chapter_coin_unlocks"("userId", "chapterId");

-- CreateIndex
CREATE INDEX "ad_reward_claims_userId_createdAt_idx" ON "ad_reward_claims"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ad_reward_claims_userId_idempotencyKey_key" ON "ad_reward_claims"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "coin_transactions_userId_idx" ON "coin_transactions"("userId");

-- CreateIndex
CREATE INDEX "coin_transactions_userId_createdAt_idx" ON "coin_transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "coin_transactions_type_idx" ON "coin_transactions"("type");

-- CreateIndex
CREATE INDEX "user_manga_lists_userId_idx" ON "user_manga_lists"("userId");

-- CreateIndex
CREATE INDEX "user_manga_list_items_listId_idx" ON "user_manga_list_items"("listId");

-- CreateIndex
CREATE INDEX "user_manga_list_items_mangaId_idx" ON "user_manga_list_items"("mangaId");

-- CreateIndex
CREATE UNIQUE INDEX "user_manga_list_items_listId_mangaId_key" ON "user_manga_list_items"("listId", "mangaId");

-- CreateIndex
CREATE INDEX "reading_progress_userId_idx" ON "reading_progress"("userId");

-- CreateIndex
CREATE INDEX "reading_progress_userId_lastReadAt_idx" ON "reading_progress"("userId", "lastReadAt");

-- CreateIndex
CREATE UNIQUE INDEX "reading_progress_userId_mangaId_key" ON "reading_progress"("userId", "mangaId");

-- CreateIndex
CREATE INDEX "takedown_requests_requesterId_idx" ON "takedown_requests"("requesterId");

-- CreateIndex
CREATE INDEX "takedown_requests_mangaId_idx" ON "takedown_requests"("mangaId");

-- CreateIndex
CREATE INDEX "takedown_requests_status_idx" ON "takedown_requests"("status");

-- CreateIndex
CREATE INDEX "takedown_requests_createdAt_idx" ON "takedown_requests"("createdAt");

-- AddForeignKey
ALTER TABLE "manga_categories" ADD CONSTRAINT "manga_categories_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "mangas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manga_categories" ADD CONSTRAINT "manga_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "mangas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_previousChapterId_fkey" FOREIGN KEY ("previousChapterId") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_nextChapterId_fkey" FOREIGN KEY ("nextChapterId") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_pages" ADD CONSTRAINT "chapter_pages_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_chapter_week_access" ADD CONSTRAINT "user_chapter_week_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_chapter_week_access" ADD CONSTRAINT "user_chapter_week_access_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_chapter_coin_unlocks" ADD CONSTRAINT "user_chapter_coin_unlocks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_chapter_coin_unlocks" ADD CONSTRAINT "user_chapter_coin_unlocks_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_reward_claims" ADD CONSTRAINT "ad_reward_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_manga_lists" ADD CONSTRAINT "user_manga_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_manga_list_items" ADD CONSTRAINT "user_manga_list_items_listId_fkey" FOREIGN KEY ("listId") REFERENCES "user_manga_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_manga_list_items" ADD CONSTRAINT "user_manga_list_items_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "mangas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "mangas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "takedown_requests" ADD CONSTRAINT "takedown_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "takedown_requests" ADD CONSTRAINT "takedown_requests_mangaId_fkey" FOREIGN KEY ("mangaId") REFERENCES "mangas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "takedown_requests" ADD CONSTRAINT "takedown_requests_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
