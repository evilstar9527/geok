-- 为 workspace_enabled_provider 增加阿里千问。
ALTER TYPE "public"."workspace_enabled_provider" ADD VALUE IF NOT EXISTS 'qianwen';
