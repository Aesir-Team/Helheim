-- DropForeignKey (linked list navigation removed — use ORDER BY number instead)
ALTER TABLE "chapters" DROP CONSTRAINT IF EXISTS "chapters_previousChapterId_fkey";
ALTER TABLE "chapters" DROP CONSTRAINT IF EXISTS "chapters_nextChapterId_fkey";

-- DropIndex (linked list)
DROP INDEX IF EXISTS "chapters_previousChapterId_key";
DROP INDEX IF EXISTS "chapters_nextChapterId_key";
DROP INDEX IF EXISTS "chapters_previousChapterId_idx";
DROP INDEX IF EXISTS "chapters_nextChapterId_idx";

-- DropColumn (linked list)
ALTER TABLE "chapters" DROP COLUMN IF EXISTS "previousChapterId";
ALTER TABLE "chapters" DROP COLUMN IF EXISTS "nextChapterId";

-- DropIndex (redundant — PK already has implicit index)
DROP INDEX IF EXISTS "users_id_idx";

-- AlterColumn: CoinTransaction.balanceAfter NOT NULL with default 0
ALTER TABLE "coin_transactions" ALTER COLUMN "balanceAfter" SET DEFAULT 0;
UPDATE "coin_transactions" SET "balanceAfter" = 0 WHERE "balanceAfter" IS NULL;
ALTER TABLE "coin_transactions" ALTER COLUMN "balanceAfter" SET NOT NULL;
