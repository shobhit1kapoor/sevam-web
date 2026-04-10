ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "users_bannedAt_idx"
ON "users"("bannedAt");
