-- Meow SDD v1.0 - 初始 Schema
-- 執行方式：在 Supabase Dashboard > SQL Editor 貼上執行，或使用 supabase db push

-- 方案類型
CREATE TYPE plan_type AS ENUM ('free', 'paid');

-- users 表（擴展 Supabase Auth，或與 auth.users 關聯）
-- 若使用 Supabase Auth，可建立 profiles 表關聯 auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  plan plan_type NOT NULL DEFAULT 'free',
  plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- cats 表
CREATE TABLE IF NOT EXISTS public.cats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cat_name TEXT NOT NULL,
  breed TEXT,
  age INTEGER,
  personality TEXT[] NOT NULL DEFAULT '{}',
  preferences TEXT,
  dislikes TEXT,
  habits TEXT,
  self_ref TEXT DEFAULT '我',
  avatar_url TEXT,
  memory_summary TEXT,
  memory_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- messages 表
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cat_id UUID NOT NULL REFERENCES public.cats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 每日訊息計數（免費版限制用）
CREATE TABLE IF NOT EXISTS public.daily_message_counts (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_cats_user_id ON public.cats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_cat_id ON public.messages(cat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(cat_id, created_at DESC);

-- RLS 啟用
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_message_counts ENABLE ROW LEVEL SECURITY;

-- RLS 政策：使用者只能存取自己的資料
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "cats_all_own" ON public.cats
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "messages_all_own" ON public.messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.cats
      WHERE cats.id = messages.cat_id AND cats.user_id = auth.uid()
    )
  );

CREATE POLICY "daily_counts_all_own" ON public.daily_message_counts
  FOR ALL USING (auth.uid() = user_id);

-- 每日訊息計數：原子遞增
CREATE OR REPLACE FUNCTION public.increment_daily_message_count(
  p_user_id UUID,
  p_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO public.daily_message_counts (user_id, date, count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, date) DO UPDATE
  SET count = daily_message_counts.count + 1
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

-- 新用戶註冊時自動建立 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 若 trigger 已存在則先刪除
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
