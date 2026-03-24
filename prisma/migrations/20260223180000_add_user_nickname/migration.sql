-- AlterTable
ALTER TABLE "users" ADD COLUMN "nickname" TEXT;

-- Backfill (IDs sem hífen garantem unicidade)
UPDATE "users" SET "nickname" = 'user_' || REPLACE(CAST("id" AS TEXT), '-', '') WHERE "nickname" IS NULL;

ALTER TABLE "users" ALTER COLUMN "nickname" SET NOT NULL;

CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");
