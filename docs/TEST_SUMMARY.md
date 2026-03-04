# 測試腳本總覽

## 現有測試腳本

### 1. `test:ai` - 一般對話回覆測試
**檔案**：`scripts/test-ai-chat.ts`

**功能**：
- 測試不同個性貓咪的 AI 回應
- 直接呼叫 Gemini API（不經過 Edge Function）
- 檢查 SDD v2.1 規範（語法框架、括號規範等）

**執行**：
```bash
GEMINI_API_KEY=your_key npm run test:ai
```

**檢查項目**：
- ✅ 基本規範：不稱「主人」、不提及 AI、2~4 句、繁體中文
- ✅ 語法框架：包含自稱、連結詞（覺得/既然/所以）
- ✅ 括號規範：句末單一括號、1-8 字、無多組括號
- ✅ 禁止詞彙：無「哈氣」、「嘶」等

**限制**：
- 不測試 Edge Function 流程
- 不測試狀態注入（mood/energy/hunger）
- 不測試認證和 CORS

---

### 2. `test:chat-complete` - Edge Function 完整流程測試 ⭐ 新增
**檔案**：`scripts/test-chat-complete.ts`

**功能**：
- 測試 Edge Function 的完整流程
- 包含狀態注入、認證、資料庫查詢
- 測試不同個性和撒嬌觸發

**執行**：
```bash
npm run test:chat-complete
# 或設定測試帳號：
TEST_EMAIL=your-test@email.com TEST_PASSWORD=your-password npm run test:chat-complete
```

**測試項目**：
1. 一般對話回覆（SDD v2.1 檢查）
2. 不同個性回覆
3. 狀態注入（mood/energy/hunger）
4. 撒嬌觸發（第 1-5 輪）

**需要**：
- 已登入（或設定 TEST_EMAIL/TEST_PASSWORD）
- Edge Function 已部署
- `daily_context` 表已建立

---

### 3. `test:daily-context` - 情境狀態系統測試 ⭐ 新增
**檔案**：`scripts/test-daily-context.ts`

**功能**：
- 測試 daily_context 更新
- 測試狀態計算邏輯
- 測試天氣整合

**執行**：
```bash
npm run test:daily-context
```

**測試項目**：
1. 狀態計算（時間基礎）
2. 天氣代碼轉換
3. daily_context 更新（無位置/有位置）
4. 資料庫記錄檢查
5. 重複更新預防
6. 狀態注入到 AI 回應

---

### 4. `test:preference` - 偏好觸發測試
**檔案**：`scripts/test-preference-trigger.ts`

**功能**：
- 測試喜歡/討厭觸發邏輯
- 測試偏好觸發指令注入

**執行**：
```bash
GEMINI_API_KEY=your_key npm run test:preference
```

---

### 5. `test:security` - 安全性測試
**檔案**：`scripts/test-security.ts`

**功能**：
- 測試 Edge Function 認證
- 測試 CORS 設定

**執行**：
```bash
npm run test:security
```

---

### 6. `test:angel` - 天使模式測試
**檔案**：`scripts/test-angel-mode.ts`

**功能**：
- 測試天使模式的特殊規則

**執行**：
```bash
GEMINI_API_KEY=your_key npm run test:angel
```

---

### 7. `test:belly` - 摸肚子觸發測試
**檔案**：`scripts/test-belly-phrases.ts`

**功能**：
- 測試摸肚子相關觸發

**執行**：
```bash
GEMINI_API_KEY=your_key npm run test:belly
```

---

## 測試覆蓋度

### ✅ 已測試
- [x] 一般對話回覆（SDD v2.1 規範）
- [x] 不同個性回覆
- [x] 偏好觸發（喜歡/討厭）
- [x] 天使模式
- [x] 安全性（認證、CORS）
- [x] 情境狀態系統（daily_context）
- [x] Edge Function 完整流程

### ⚠️ 部分測試
- [ ] Edge Function 狀態注入（需要登入）
- [ ] 撒嬌觸發機制（需要登入）

### ❌ 未測試
- [ ] 記憶摘要功能
- [ ] 開場白生成
- [ ] 罐頭訊息庫
- [ ] 訊息限制功能

## 建議測試流程

### 開發階段
1. **快速測試**：`npm run test:ai`（直接測試 prompt）
2. **完整測試**：`npm run test:chat-complete`（測試 Edge Function）

### 部署前
1. **安全性**：`npm run test:security`
2. **狀態系統**：`npm run test:daily-context`
3. **完整流程**：`npm run test:chat-complete`

### 定期回歸測試
```bash
# 執行所有測試
npm run test:ai
npm run test:preference
npm run test:security
npm run test:daily-context
npm run test:chat-complete
```

## 測試帳號設定

為了執行需要登入的測試，可以：

1. **使用現有帳號**：在前端登入後執行測試
2. **設定測試帳號**：在 `.env` 加入：
   ```bash
   TEST_EMAIL=your-test@email.com
   TEST_PASSWORD=your-password
   ```

## 相關文件

- [SETUP_DAILY_CONTEXT.md](./SETUP_DAILY_CONTEXT.md) - daily_context 設定指南
- [TEST_DAILY_CONTEXT.md](./TEST_DAILY_CONTEXT.md) - daily_context 測試指南
