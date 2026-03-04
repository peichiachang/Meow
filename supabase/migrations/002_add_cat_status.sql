-- Meow SDD v2.0 - 新增貓咪狀態欄位（Living/Angel）
-- 執行方式：在 Supabase Dashboard > SQL Editor 貼上執行

-- 新增 status 欄位（預設為 'Living'）
ALTER TABLE public.cats 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Living' CHECK (status IN ('Living', 'Angel'));

-- 為現有資料設定預設值
UPDATE public.cats SET status = 'Living' WHERE status IS NULL;

-- 建立索引以優化查詢
CREATE INDEX IF NOT EXISTS idx_cats_status ON public.cats(status);
