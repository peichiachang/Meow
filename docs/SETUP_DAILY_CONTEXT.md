# Daily Context 設定指南

## 步驟 1: 執行 Migration

### 方法 A: 使用 Supabase Dashboard（推薦）

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案
3. 點擊左側選單的 **SQL Editor**
4. 點擊 **New query**
5. 複製 `supabase/migrations/004_daily_context.sql` 的內容
6. 貼上到 SQL Editor
7. 點擊 **Run** 執行

### 方法 B: 使用 Supabase CLI

```bash
cd /Users/pagechang/Desktop/ProjectCat/cat-ai-chat
supabase db push
```

## 步驟 2: 測試狀態注入

### 測試步驟

1. **開啟 App 並登入**
2. **發送一則訊息給貓咪**
3. **檢查 Edge Function 日誌**：
   - 前往 Supabase Dashboard > Edge Functions > chat
   - 查看 Logs，確認有讀取 `daily_context` 的查詢
4. **檢查 AI 回應**：
   - AI 的回應應該會根據時間和天氣顯示不同的 mood
   - 例如：早上 6-9 點會顯示「期待（討飯模式）」
   - 例如：下午 14-17 點會顯示「慵懶（午睡時段）」

### 驗證狀態計算

狀態會自動計算並注入：

- **mood**：根據時間和天氣計算
  - 時間基礎：06:00-09:00 → 期待（討飯模式）
  - 天氣覆蓋：如果今天有更新天氣，會優先使用天氣 mood
- **energy**：根據時間計算（0-100）
- **hunger**：根據距離上次開啟 App 的時間計算（0-100）

## 步驟 3: 天氣更新功能（已整合）

天氣更新功能已經整合到 `App.tsx` 中，會在以下時機自動執行：

- **使用者登入後**：自動呼叫 `updateDailyContext()`
- **每天只更新一次**：後端會檢查今天是否已更新，避免重複呼叫 API

### 位置授權

- **有授權**：使用使用者的實際位置取得天氣
- **未授權**：使用上次儲存的位置或預設台北座標

### 手動測試天氣更新

如果需要手動測試，可以在瀏覽器 Console 執行：

```javascript
// 需要先登入
import { updateDailyContext } from './services/dailyContextService';
await updateDailyContext();
```

### 檢查更新結果

1. 前往 Supabase Dashboard > Table Editor > `daily_context`
2. 查看是否有今天的記錄
3. 檢查 `weather_code` 和 `weather_mood` 欄位

## 故障排除

### Migration 執行失敗

如果遇到錯誤，檢查：
- 是否已經有 `daily_context` 表（可能需要先刪除）
- RLS 政策是否正確設定
- 索引是否建立成功

### 狀態沒有注入

檢查：
- Edge Function 日誌是否有錯誤
- `daily_context` 表是否有今天的記錄
- 使用者是否已登入（需要 user_id）

### 天氣更新失敗

檢查：
- Edge Function `update-daily-context` 是否已部署
- 瀏覽器 Console 是否有錯誤訊息
- 位置授權是否被拒絕（這是正常的，會使用預設位置）

## 相關檔案

- Migration: `supabase/migrations/004_daily_context.sql`
- Edge Function: `supabase/functions/update-daily-context/index.ts`
- 狀態計算: `supabase/functions/_shared/stateCalculator.ts`
- 前端服務: `src/services/dailyContextService.ts`
- 前端整合: `src/App.tsx`
