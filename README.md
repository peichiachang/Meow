# Meow - 了解喵喵的內心話

依 [SDD v1.3](docs/SDD.md) 開發的純娛樂 AI 角色扮演 App，模擬使用者自家貓咪說話。  
**供 AI coding tool 參考**：完整軟體設計見 [docs/SDD.md](docs/SDD.md)。

## 技術棧

- **前端**：React + Vite + TypeScript + Tailwind CSS
- **後端**：Supabase（Auth、Database、Storage、Edge Functions）
- **AI**：Google Gemini 2.5 Flash-Lite（開發測試免費版，透過 Edge Function 代理）

## 功能

- 貓咪角色設定（名字、品種、年齡、個性等）
- 18 種個性模板 + 自訂
- 動態 System Prompt（角色 + 說話規則 + 記憶摘要）
- 每 10 則對話後非同步產生記憶摘要
- 開場白（時間、等待感、隨機行為、天氣選填，需位置授權）
- 登入：Email/密碼 + Google OAuth
- 免費版：每日 10 則訊息、1 隻貓
- 付費版：無限制訊息、最多 5 隻貓（v1 先做免費版）

## 設定

### 1. Supabase 專案

1. 至 [Supabase](https://supabase.com) 建立專案
2. 在 SQL Editor 執行 `supabase/migrations/001_initial_schema.sql`
3. 取得 Project URL 與 anon key（Settings > API）

### 2. Edge Function（Gemini 2.5 Flash-Lite 代理）

**部署時必須設定 `GEMINI_API_KEY`**：AI 對話與記憶摘要皆透過 Edge Function 呼叫 Gemini，未設定則 AI 功能無法使用。

```bash
# 安裝 Supabase CLI
npm install -g supabase

# 登入並連結專案
supabase login
supabase link --project-ref your-project-ref

# 【必做】設定 Secret（Gemini API Key 免費取得：https://aistudio.google.com/apikey）
supabase secrets set GEMINI_API_KEY=your_gemini_api_key

# 部署 Edge Functions
supabase functions deploy chat
supabase functions deploy summarize-memory
supabase functions deploy cleanup-old-messages
```

部署後可至 Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets** 確認 `GEMINI_API_KEY` 已設定。

### 3. Google 登入（選用）

1. 至 [Google Cloud Console](https://console.cloud.google.com/) 建立專案（或選現有專案）
2. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
3. 應用程式類型選 **Web application**
4. **Authorized redirect URIs** 新增：
   ```
   https://aelwjnpqfavuwbxhmczt.supabase.co/auth/v1/callback
   ```
   （將 `aelwjnpqfavuwbxhmczt` 換成你的 Supabase 專案 ref）
5. 複製 **Client ID** 與 **Client Secret**
6. 至 Supabase Dashboard → **Authentication** → **Providers** → **Google**
7. 啟用 Google，貼上 Client ID 與 Client Secret，儲存
8. **Authentication** → **URL Configuration** → **Redirect URLs** 新增：
   - `http://localhost:5173/`（本地開發）
   - 正式網域（部署後）

### 4. 環境變數

複製 `.env.example` 為 `.env`，填入：

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 5. 取得 Gemini API Key（Edge Function 與本機測試用）

至 [Google AI Studio](https://aistudio.google.com/apikey) 取得 API Key（免費），並在 Supabase 設定為 `GEMINI_API_KEY`（見步驟 2）。本機跑 `npm run test:ai` 時可在 `.env` 設定 `GEMINI_API_KEY`。

## 啟動

```bash
npm install
npm run dev
```

## 建置

```bash
npm run build
```

## AI 對話測試

在 `.env` 加入 `GEMINI_API_KEY`（[免費取得](https://aistudio.google.com/apikey)）後執行：

```bash
npm run test:ai
```

使用 Gemini 2.5 Flash-Lite 測試三種個性（傲嬌、吃貨、冷淡）的 AI 回應，並檢查是否符合 SDD 2.3：
- 不稱「主人」
- 不提及 AI / 語言模型
- 每次 2~4 句
- 繁體中文

## 90 天對話清理（選用）

SDD 5.2：對話記錄保留 90 天，超過自動清除。

**方式 A：Supabase pg_cron（Pro 方案）**  
在 `supabase/migrations/002_cleanup_old_messages.sql` 中取消註解 pg_cron 排程。

**方式 B：外部排程**  
每日呼叫 Edge Function `cleanup-old-messages`：

```bash
# 設定 Secret
supabase secrets set CRON_SECRET=your_random_secret

# 每日呼叫（需自行設定 cron）
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-old-messages" \
  -H "x-cron-secret: your_random_secret"
```

## 部署到 Vercel（推薦）

部署後會有固定網址，電腦與手機都能用，Supabase 只需設定一次。

### 1. 推送程式碼到 GitHub

（若尚未建立 repo，先在 GitHub 建立專案並 push）

### 2. 在 Vercel 匯入專案

1. 至 [vercel.com](https://vercel.com) 登入（可用 GitHub）
2. **Add New** → **Project** → 選擇你的 repo
3. **Environment Variables** 新增：
   - `VITE_SUPABASE_URL` = 你的 Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = 你的 anon key
4. 點 **Deploy**

### 3. 部署完成後

Vercel 會給網址，例如 `https://meow-xxx.vercel.app`。

**提醒**：AI 對話與記憶摘要需 Supabase Edge Function；請確認已依上方「Edge Function」步驟設定 `GEMINI_API_KEY`。

到 **Supabase** → Authentication → URL Configuration：

- **Site URL**：`https://meow-xxx.vercel.app`（換成你的 Vercel 網址）
- **Redirect URLs** 新增：`https://meow-xxx.vercel.app/`

到 **Google Cloud Console** → OAuth 憑證 → Authorized redirect URIs 已包含 Supabase callback 即可（不需改）。

之後用這個 Vercel 網址在電腦或手機開啟，不需再改 Supabase。

---

## 本地手機測試（暫不部署時）

見 `docs/LOCAL_TESTING.md`（ngrok / localtunnel）。

## 待決定事項

見 `docs/SDD_DECISIONS.md`。
