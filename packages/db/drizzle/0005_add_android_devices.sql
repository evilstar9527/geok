ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "exposure_terms" text[] DEFAULT '{}' NOT NULL;
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "scheduled_execution_surfaces" text[] DEFAULT '{web}' NOT NULL;

DO $$ BEGIN
 CREATE TYPE "public"."device_kind" AS ENUM('local_adb', 'remote_appium');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."device_status" AS ENUM('ready', 'busy', 'offline', 'login_required', 'unsupported');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "public"."device_artifact_kind" AS ENUM('success', 'failure');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "device_connections" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "workspace_id" text NOT NULL,
 "name" varchar(128) NOT NULL,
 "kind" "device_kind" NOT NULL,
 "serial" varchar(256) NOT NULL,
 "appium_url" varchar(2048) NOT NULL,
 "encrypted_config" text,
 "supported_providers" text[] DEFAULT '{}' NOT NULL,
 "enabled" boolean DEFAULT true NOT NULL,
 "status" "device_status" DEFAULT 'offline' NOT NULL,
 "model" varchar(256),
 "android_version" varchar(64),
 "appium_version" varchar(64),
 "last_checked_at" timestamp,
 "last_error" text,
 "created_by" text NOT NULL,
 "created_at" timestamp DEFAULT now() NOT NULL,
 "updated_at" timestamp DEFAULT now() NOT NULL,
 "deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "device_artifacts" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "workspace_id" text NOT NULL,
 "run_id" varchar(128) NOT NULL,
 "response_id" varchar(128),
 "prompt_id" varchar(256) NOT NULL,
 "provider" varchar(64) NOT NULL,
 "device_id" uuid,
 "kind" "device_artifact_kind" NOT NULL,
 "storage_key" text NOT NULL,
 "expires_at" timestamp NOT NULL,
 "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "device_connections" ADD CONSTRAINT "device_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "device_connections" ADD CONSTRAINT "device_connections_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "device_artifacts" ADD CONSTRAINT "device_artifacts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
 ALTER TABLE "device_artifacts" ADD CONSTRAINT "device_artifacts_device_id_device_connections_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device_connections"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "device_connections_workspace_id_idx" ON "device_connections" ("workspace_id");
CREATE INDEX IF NOT EXISTS "device_artifacts_workspace_id_idx" ON "device_artifacts" ("workspace_id");
CREATE INDEX IF NOT EXISTS "device_artifacts_expires_at_idx" ON "device_artifacts" ("expires_at");
