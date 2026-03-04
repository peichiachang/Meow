# Daily Context 自動化測試指南

## 快速開始

### 方法 1: 使用現有帳號（推薦）

1. **在前端登入 App**
2. **執行測試**：
   ```bash
   npm run test:daily-context
   ```

測試腳本會自動使用瀏覽器的 session（如果可用）。

### 方法 2: 使用測試帳號

1. **設定環境變數**（在 `.env` 或執行時設定）：
   ```bash
   TEST_EMAIL=your-test@email.com
   TEST_PASSWORD=your-password
   ```

2. **執行測試**：
   ```bash
   npm run test:daily-context
   ```

測試腳本會自動嘗試登入或註冊測試帳號。

### 方法 3: 手動建立測試帳號

1. 在 Supabase Dashboard > Authentication > Users 建立測試使用者
2. 執行測試（腳本會自動使用 session）

## 測試項目

測試腳本會執行以下測試：

1. ✅ **狀態計算（時間基礎）**：驗證根據當前時間計算的 energy 和 mood
2. ✅ **天氣代碼轉換**：驗證天氣代碼轉換為 mood 的邏輯
3. 🔐 **更新 daily_context（無位置）**：測試使用預設位置更新天氣
4. 🔐 **更新 daily_context（有位置）**：測試使用指定位置更新天氣
5. 🔐 **檢查 daily_context 資料庫記錄**：驗證資料是否正確儲存
6. 🔐 **重複更新預防**：驗證同一天只更新一次
7. 🔐 **chat Edge Function 狀態注入**：測試 AI 回應是否包含狀態

🔐 = 需要登入

## 測試結果解讀

### 成功範例

```
✅ 測試 1: 更新 daily_context（無位置）
   成功更新 daily_context
   詳情： {
     "weather_code": 800,
     "weather_mood": "慵懶曬太陽",
     "location": { "lat": 25.033, "lng": 121.5654 }
   }
```

### 失敗範例

如果測試失敗，會顯示詳細錯誤訊息：

```
❌ 測試 1: 更新 daily_context（無位置）
   更新失敗：Unauthorized
   詳情： { "status": 401, "data": {...} }
```

## 故障排除

### 問題 1: 所有測試都跳過

**原因**：未登入

**解決方案**：
- 在前端登入後再執行測試
- 或設定 `TEST_EMAIL` 和 `TEST_PASSWORD` 環境變數

### 問題 2: 更新 daily_context 失敗

**可能原因**：
- Edge Function 未部署
- 認證 token 過期
- 資料庫 migration 未執行

**檢查步驟**：
1. 確認 `update-daily-context` Edge Function 已部署
2. 確認 `daily_context` 表已建立（執行 migration）
3. 檢查 Supabase Dashboard > Edge Functions > Logs

### 問題 3: 狀態沒有注入到 AI 回應

**可能原因**：
- `daily_context` 表沒有今天的記錄
- Edge Function 查詢邏輯有問題

**檢查步驟**：
1. 確認 `daily_context` 表有今天的記錄
2. 檢查 Edge Function 日誌
3. 確認 `fetched_date` 欄位正確設定

## 進階使用

### 只測試特定項目

修改 `scripts/test-daily-context.ts`，註解掉不需要的測試：

```typescript
// await testUpdateDailyContextWithoutLocation(); // 跳過此測試
```

### 測試特定時間的狀態

修改 `testTimeBasedStateCalculation()` 函數來測試不同時間：

```typescript
const now = new Date();
now.setHours(14); // 測試下午 2 點
const hour = now.getHours();
```

## 相關檔案

- 測試腳本：`scripts/test-daily-context.ts`
- Edge Function：`supabase/functions/update-daily-context/index.ts`
- 狀態計算：`supabase/functions/_shared/stateCalculator.ts`
