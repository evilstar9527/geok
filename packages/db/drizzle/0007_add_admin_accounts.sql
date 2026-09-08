ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "username" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "display_username" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'user' NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "user_username_unique" ON "user" ("username");

-- Keep existing installations usable: the oldest account becomes the initial
-- administrator. New installations promote their first registered account in
-- the auth hook.
UPDATE "user"
SET "role" = 'admin'
WHERE "id" = (
	SELECT "id" FROM "user" ORDER BY "created_at" ASC LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM "user" WHERE "role" = 'admin');
