-- Meow SDD 5.2 - 90 天對話清理
-- 方式一：使用 pg_cron（需 Supabase Pro 且啟用 pg_cron）
-- 若無 pg_cron，請使用方式二：外部排程呼叫 Edge Function cleanup-old-messages

-- 建立清理函數（供 pg_cron 或手動呼叫）
CREATE OR REPLACE FUNCTION public.cleanup_messages_older_than_90_days()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.messages
    WHERE created_at < NOW() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO deleted_count FROM deleted;
  RETURN deleted_count;
END;
$$;

-- 若已啟用 pg_cron，可取消註解以下內容以設定每日執行：
/*
SELECT cron.schedule(
  'cleanup-old-messages',
  '0 4 * * *',  -- 每天 UTC 04:00（台灣時間 12:00）
  $$SELECT public.cleanup_messages_older_than_90_days()$$
);
*/
