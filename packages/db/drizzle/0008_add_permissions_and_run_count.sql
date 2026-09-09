ALTER TABLE "workspaces" ADD COLUMN "run_count" integer DEFAULT 1 NOT NULL;
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_run_count_check" CHECK ("run_count" BETWEEN 1 AND 50);
CREATE UNIQUE INDEX "user_single_admin_idx" ON "user" USING btree ("role") WHERE "role" = 'admin';
