-- 年齡改為支援小數（幼貓 0.5、0.7 等），解決 "invalid input syntax for type integer: 0.7"
-- 執行：Supabase Dashboard > SQL Editor 貼上並執行本檔內容，或 supabase db push

ALTER TABLE public.cats
  ALTER COLUMN age TYPE DOUBLE PRECISION USING age::double precision;
