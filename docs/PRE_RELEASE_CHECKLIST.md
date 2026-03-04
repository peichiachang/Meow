# 正式發布前檢查清單

## ✅ 已完成項目

### 1. 資料庫 Migration
- [x] `001_initial_schema.sql` - 基礎表結構
- [x] `002_add_cat_status.sql` - 貓咪狀態欄位
- [x] `003_cats_age_decimal.sql` - 年齡欄位調整
- [x] `004_daily_context.sql` - 情境狀態系統 ⭐ 新增

### 2. Edge Functions 部署
- [x] `chat` - AI 對話功能（已部署）
- [x] `summarize-memory` - 記憶摘要功能（已部署）
- [x] `cleanup-old-messages` - 訊息清理功能（已部署）
- [x] `update-daily-context` - 天氣更新功能 ⭐ 新增（已部署）

### 3. 安全性實作
- [x] Edge Function 認證（JWT token）
- [x] CORS 動態設定（ALLOWED_ORIGINS）
- [x] Row Level Security (RLS) 政策
- [x] API Key 保護（不在前端暴露）
- [x] 輸入驗證（JSON 解析、訊息長度限制）

### 4. 功能實作
- [x] SDD v2.1 Prompt Builder 更新
- [x] 情境狀態系統（mood/energy/hunger）
- [x] 天氣整合（daily_context）
- [x] 撒嬌觸發機制（第 1-5 輪）
- [x] 偏好觸發（喜歡/討厭）
- [x] 天使模式
- [x] 記憶摘要機制

### 5. 測試
- [x] 一般對話回覆測試（8/9 通過）
- [x] 情境狀態系統測試（2/2 通過）
- [x] 安全性測試腳本
- [x] 偏好觸發測試腳本

### 6. 文件
- [x] SETUP_DAILY_CONTEXT.md - 設定指南
- [x] TEST_DAILY_CONTEXT.md - 測試指南
- [x] TEST_SUMMARY.md - 測試總覽
- [x] SECURITY_AUDIT.md - 安全審計報告

---

## ⚠️ 發布前必須檢查項目

### 1. Supabase 環境變數設定

**必須在 Supabase Dashboard > Edge Functions > Secrets 設定：**

- [ ] `GEMINI_API_KEY` - Gemini API Key（必填）
- [ ] `ALLOWED_ORIGINS` - 生產域名（必填，例如：`https://yourdomain.com,https://www.yourdomain.com`）
- [ ] `CRON_SECRET` - 排程驗證密鑰（如果使用 cleanup-old-messages 排程）
- [ ] `DAILY_MESSAGE_LIMIT` - 每日訊息上限（選填，預設 20，設為 0 或負數 = 不限次數）
- [ ] `EXEMPT_USER_IDS` - 例外帳號列表（選填，不受訊息限制），以逗號分隔的 user_id

**檢查方式：**
```bash
# 在 Supabase Dashboard 檢查
Project Settings > Edge Functions > Secrets
```

### 2. 資料庫 Migration 確認

**確認所有 migration 已執行：**

- [ ] `001_initial_schema.sql` ✅
- [ ] `002_add_cat_status.sql` ✅
- [ ] `003_cats_age_decimal.sql` ✅
- [ ] `004_daily_context.sql` ✅（最新）

**檢查方式：**
- Supabase Dashboard > Table Editor
- 確認以下表存在：
  - `profiles`
  - `cats`
  - `messages`
  - `daily_message_counts`
  - `daily_context` ⭐ 新增

### 3. Edge Functions 部署確認

**確認所有 Edge Functions 已部署：**

- [ ] `chat` ✅
- [ ] `summarize-memory` ✅
- [ ] `cleanup-old-messages` ✅
- [ ] `update-daily-context` ✅（最新）

**檢查方式：**
```bash
supabase functions list
# 或
# Supabase Dashboard > Edge Functions
```

### 4. 前端環境變數

**確認 `.env` 或部署平台（Vercel）已設定：**

- [ ] `VITE_SUPABASE_URL` - Supabase 專案 URL
- [ ] `VITE_SUPABASE_ANON_KEY` - Supabase Anon Key
- [ ] `VITE_DAILY_MESSAGE_LIMIT` - 每日訊息限制（選填，預設 20）

**檢查方式：**
- 本地：檢查 `.env` 檔案
- Vercel：Project Settings > Environment Variables

### 5. CORS 設定

**確認生產域名已加入 ALLOWED_ORIGINS：**

- [ ] 生產域名已設定（例如：`https://meow-tawny-six.vercel.app`）
- [ ] 測試 CORS 是否正常運作

**檢查方式：**
```bash
npm run test:security
```

### 6. 功能測試

**執行完整測試：**

- [ ] `npm run test:security` - 安全性測試
- [ ] `npm run test:daily-context` - 狀態系統測試
- [ ] `npm run test:ai` - AI 回應測試（需要 GEMINI_API_KEY）
- [ ] `npm run test:chat-complete` - Edge Function 完整流程（需要登入）

### 7. 生產環境檢查

**部署到生產環境後檢查：**

- [ ] 前端可以正常載入
- [ ] 登入功能正常
- [ ] 可以發送訊息給貓咪
- [ ] AI 回應正常
- [ ] 狀態注入正常（檢查 AI 回應是否包含 mood）
- [ ] 天氣更新正常（檢查 `daily_context` 表）
- [ ] 訊息限制功能正常（免費版每日 30 則）

### 8. 效能檢查

- [ ] API 回應時間正常（< 5 秒）
- [ ] 無 504 Gateway Timeout 錯誤
- [ ] 歷史訊息限制正常（最多 5 條）

### 9. 錯誤處理

- [ ] 網路錯誤有適當提示
- [ ] API 錯誤有友善訊息
- [ ] 認證錯誤有適當處理

### 10. 文件完整性

- [ ] README.md 已更新
- [ ] 設定指南完整
- [ ] 測試文件完整

---

## 🔴 關鍵檢查項目（發布前必做）

### 1. 安全性（最高優先級）

- [ ] **ALLOWED_ORIGINS 已設定生產域名**
- [ ] **GEMINI_API_KEY 已設定（使用付費版，不用於訓練）**
- [ ] **Edge Function 認證正常運作**
- [ ] **RLS 政策已啟用**

### 2. 功能完整性

- [ ] **所有 Migration 已執行**
- [ ] **所有 Edge Functions 已部署**
- [ ] **daily_context 表已建立**
- [ ] **狀態系統正常運作**

### 3. 測試驗證

- [ ] **安全性測試通過**
- [ ] **功能測試通過**
- [ ] **生產環境手動測試通過**

---

## 📋 快速檢查命令

```bash
# 1. 檢查 Edge Functions 部署狀態
supabase functions list

# 2. 執行安全性測試
npm run test:security

# 3. 執行狀態系統測試
npm run test:daily-context

# 4. 執行 AI 回應測試（需要 GEMINI_API_KEY）
npm run test:ai

# 5. 建置前端
npm run build
```

---

## 🚀 發布步驟

1. **確認所有檢查項目完成**
2. **執行完整測試套件**
3. **部署前端到 Vercel**
4. **驗證生產環境功能**
5. **監控錯誤日誌**

---

## 📝 已知問題

1. **test:ai 測試結果**：8/9 通過，1 則回應缺少連結詞（非關鍵問題）
2. **test:chat-complete 需要登入**：需要設定 TEST_EMAIL/TEST_PASSWORD 或在前端登入後執行

---

## 🔗 相關文件

- [SECURITY_AUDIT.md](../SECURITY_AUDIT.md) - 安全審計報告
- [SETUP_DAILY_CONTEXT.md](./SETUP_DAILY_CONTEXT.md) - daily_context 設定指南
- [TEST_SUMMARY.md](./TEST_SUMMARY.md) - 測試總覽
