-- 为 workspace_enabled_provider 增加国内 AI 平台:Kimi、腾讯元宝。
--
-- 用 IF NOT EXISTS 使迁移可重复执行 —— ALTER TYPE ... ADD VALUE 在已存在时会报错,
-- 而 drizzle-kit 不会为枚举扩展生成回滚脚本。
--
-- 注意:ALTER TYPE ... ADD VALUE 在 PostgreSQL 12+ 可以在事务中执行,
-- 但新值在同一事务内不可使用。此处只加值、不消费,因此安全。
ALTER TYPE "public"."workspace_enabled_provider" ADD VALUE IF NOT EXISTS 'kimi';--> statement-breakpoint
ALTER TYPE "public"."workspace_enabled_provider" ADD VALUE IF NOT EXISTS 'yuanbao';
