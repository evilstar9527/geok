-- 可公开分享的 GEO 报告快照。
CREATE TABLE "reports" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"brand_name" varchar(256) NOT NULL,
	"brand_domain" varchar(256),
	"data" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reports_workspace_id_idx" ON "public"."reports" ("workspace_id");
