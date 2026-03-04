-- Meow SDD v2.1 - daily_context 表
-- 每日更新一次，儲存用於注入 AI 對話情境的時間與天氣資訊

CREATE TABLE IF NOT EXISTS public.daily_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weather_code INTEGER,
  weather_mood TEXT, -- 由 weather_code 轉換的心情描述（如：下雨煩躁、晴天慵懶）
  location_lat DOUBLE PRECISION, -- 使用者位置緯度（選填授權）
  location_lng DOUBLE PRECISION, -- 使用者位置經度（選填授權）
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 最後抓取時間，判斷是否需要更新
  fetched_date DATE NOT NULL DEFAULT CURRENT_DATE, -- 日期部分（用於唯一索引，台灣時間）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 每個使用者每天只有一筆記錄（使用 date 欄位）
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_context_user_date 
ON public.daily_context(user_id, fetched_date);

-- 索引
CREATE INDEX IF NOT EXISTS idx_daily_context_user_id ON public.daily_context(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_context_fetched_date ON public.daily_context(user_id, fetched_date);

-- 觸發器：自動更新 fetched_date 欄位（轉換為台灣時間的日期）
CREATE OR REPLACE FUNCTION public.update_daily_context_date()
RETURNS TRIGGER AS $$
BEGIN
  -- 將 fetched_at 轉換為台灣時間（UTC+8）的日期
  NEW.fetched_date := (NEW.fetched_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei')::date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_daily_context_date ON public.daily_context;
CREATE TRIGGER trigger_update_daily_context_date
  BEFORE INSERT OR UPDATE OF fetched_at ON public.daily_context
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_context_date();

-- RLS 啟用
ALTER TABLE public.daily_context ENABLE ROW LEVEL SECURITY;

-- RLS 政策：使用者只能存取自己的資料
CREATE POLICY "daily_context_all_own" ON public.daily_context
  FOR ALL USING (auth.uid() = user_id);
