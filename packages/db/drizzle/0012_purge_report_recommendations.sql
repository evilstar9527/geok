-- 报告里退役的「优化建议」：不再生成、不再展示，公开数据接口也不再返回。
-- 但存量快照的 JSON 里还留着模型写的「怎么做 / 依据 / 观察指标」，
-- 这里把它从已存快照中摘掉，避免旧报告链接仍能拿到整套做法。
-- 单行转换失败只跳过该行并告警：损坏的快照不该阻塞迁移和部署。
DO $$
DECLARE
 r record;
BEGIN
 FOR r IN SELECT "id", "data" FROM "reports" WHERE "data" LIKE '%"recommendations"%' LOOP
  BEGIN
   UPDATE "reports"
   SET "data" = (r."data"::jsonb - 'recommendations')::text
   WHERE "id" = r."id";
  EXCEPTION WHEN others THEN
   RAISE WARNING 'report % left unchanged: %', r."id", SQLERRM;
  END;
 END LOOP;
END $$;
