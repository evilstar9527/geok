-- 管理员填写的品牌事实（BrandProfile 的 JSON 字符串）。生成 PR 稿时注入，避免模型编造。
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "brand_profile" text;

-- 由某个提示词的信源生成的品牌 PR 稿。data 里放整份 PrArticleData JSON。
CREATE TABLE IF NOT EXISTS "pr_articles" (
 "id" varchar(128) PRIMARY KEY NOT NULL,
 "workspace_id" text NOT NULL,
 "prompt_id" varchar(256) NOT NULL,
 "prompt_text" text NOT NULL,
 "title" varchar(512) NOT NULL,
 "data" text NOT NULL,
 "created_by" text,
 "created_at" timestamp DEFAULT now() NOT NULL,
 "deleted_at" timestamp
);

DO $$ BEGIN
 ALTER TABLE "pr_articles" ADD CONSTRAINT "pr_articles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "pr_articles" ADD CONSTRAINT "pr_articles_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "pr_articles_workspace_id_idx" ON "pr_articles" ("workspace_id");
CREATE INDEX IF NOT EXISTS "pr_articles_prompt_id_idx" ON "pr_articles" ("prompt_id");
