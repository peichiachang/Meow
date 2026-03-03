# Meow SDD - 待決定事項

依 [SDD v1.3](./SDD.md) 實作時，以下項目需要你決定或提供資訊。

---

## 1. 後端 API 代理

**SDD 要求**：所有 AI API 呼叫透過後端代理，不在前端暴露 API Key。

**方案**：使用 **Supabase Edge Functions** 作為代理（與 Supabase 整合，無需額外伺服器）。目前使用 **Gemini 2.5 Flash-Lite**（測試階段）。

**你需要**：
- 在 [Supabase Dashboard](https://supabase.com/dashboard) 建立專案
- 設定 Edge Function 的 Secret：`GEMINI_API_KEY`
- 取得 [Gemini API Key](https://aistudio.google.com/apikey)（免費）

**替代**：若升級至 Claude Haiku 4.5，改設 `ANTHROPIC_API_KEY` 並調整 Edge Function 的 model。

---

## 2. AI 模型版本

**SDD 指定（測試階段）**：`gemini-2.5-flash-lite`

**備選**：`claude-haiku-4-5-20251001`（視品質升級）。實作時以 SDD 指定之 Gemini 為準。

---

## 3. 開場白：天氣功能

**SDD 4.2**：開場白可包含「外面好像在下雨...」（需位置權限取得天氣）。

**待決定**：v1 是否實作天氣開場白？
- **A**：實作（需整合天氣 API + 使用者授權位置）
- **B**：v1 不實作，僅用時間、等待、隨機行為

---

## 4. 貓咪頭像預設

**SDD**：`cats.avatar_url` 存於 Supabase Storage。

**待決定**：使用者未上傳頭像時：
- **A**：顯示預設貓咪 emoji（🐱）或 placeholder 圖
- **B**：強制要求上傳才能建立貓咪

---

## 5. 付費訂閱（Stripe）

**SDD**：$2.99 USD/月，付費版無限制訊息、最多 5 隻貓。

**待決定**：v1 實作範圍？
- **A**：完整實作 Stripe 訂閱（需 Stripe 帳號、webhook）
- **B**：v1 僅做免費版，付費邏輯先留空（plan 欄位預設 free）

---

## 6. 開場白預設庫

**SDD 4.2**：開場白從「預設庫 + AI 生成混合」。

**待決定**：預設庫內容：
- **A**：由我設計一組固定開場白（約 10–20 句）
- **B**：你提供預設文案

---

## 7. 環境變數

實作時會使用以下環境變數，你需在 Supabase 與專案中設定：

| 變數 | 用途 |
|------|------|
| `VITE_SUPABASE_URL` | Supabase 專案 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名 key（前端） |
| `GEMINI_API_KEY` | Supabase Edge Function Secret（AI 對話與記憶摘要） |

---

以上項目若有決定，請直接回覆或更新此文件。未決定時，我會採用較保守的預設（B 選項）。
