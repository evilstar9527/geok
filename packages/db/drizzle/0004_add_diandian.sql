-- 为 workspace_enabled_provider 增加小红书点点。
ALTER TYPE "public"."workspace_enabled_provider" ADD VALUE IF NOT EXISTS 'diandian';
