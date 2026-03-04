# 後端訊息限制實作說明

## 概述

為了防止使用者繞過前端檢查直接呼叫 API，Edge Function (`chat`) 現在會在後端檢查每日訊息限制。

## 實作細節

### 1. 檢查時機

- **檢查位置**：在認證通過後、處理請求前
- **檢查邏輯**：
  1. 讀取環境變數 `DAILY_MESSAGE_LIMIT`（預設 20）
  2. 讀取環境變數 `EXEMPT_USER_IDS`（可選）
  3. 查詢 `daily_message_counts` 表取得今天的訊息數量
  4. 如果超過限制且不是例外帳號，返回 `429 Too Many Requests`

### 2. 計數遞增

- **時機**：成功處理訊息並取得 AI 回應後
- **方式**：使用 PostgreSQL 原子函數 `increment_daily_message_count`
- **錯誤處理**：遞增失敗不影響回應，但會記錄錯誤

### 3. 環境變數設定

在 Supabase Dashboard > Edge Functions > Secrets 設定：

- `DAILY_MESSAGE_LIMIT`（選填）
  - 預設值：20
  - 設為 0 或負數 = 不限次數
  - 範例：`DAILY_MESSAGE_LIMIT=20`

- `EXEMPT_USER_IDS`（選填）
  - 例外帳號列表，不受訊息限制
  - 以逗號分隔的 user_id
  - 範例：`EXEMPT_USER_IDS=user_id_1,user_id_2`

## 錯誤回應

當超過限制時，Edge Function 會返回：

```json
{
  "error": "今日訊息已達上限",
  "detail": "每日限制 20 則訊息，請明天再試或升級方案"
}
```

HTTP 狀態碼：`429 Too Many Requests`

## 安全性

- ✅ 後端檢查防止繞過前端限制
- ✅ 使用原子操作確保計數一致性
- ✅ 支援例外帳號（管理員、測試帳號等）
- ✅ 錯誤處理不會洩露敏感資訊

## 注意事項

1. **環境變數同步**：確保 Edge Function 的 `DAILY_MESSAGE_LIMIT` 與前端的 `VITE_DAILY_MESSAGE_LIMIT` 一致（建議都設為 20）

2. **時區處理**：使用台灣時間（UTC+8）計算日期，確保與前端一致

3. **效能考量**：每次請求都會查詢資料庫，但由於使用索引，效能影響很小

4. **例外帳號**：建議將管理員帳號加入 `EXEMPT_USER_IDS`，避免測試時受限

## 測試

測試後端限制檢查：

```bash
# 1. 設定環境變數（在 Supabase Dashboard）
DAILY_MESSAGE_LIMIT=5  # 設定較小的限制用於測試

# 2. 發送超過限制的請求
# 應該會收到 429 錯誤

# 3. 檢查例外帳號
EXEMPT_USER_IDS=your_user_id
# 該帳號應該不受限制
```

## 相關文件

- [PRE_RELEASE_CHECKLIST.md](./PRE_RELEASE_CHECKLIST.md) - 發布前檢查清單
- [SECURITY_AUDIT.md](../SECURITY_AUDIT.md) - 安全審計報告
