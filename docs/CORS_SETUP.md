# CORS 設定指南

## 概述

Edge Functions 現在使用動態 CORS 設定，可以根據環境變數限制允許的請求來源，提升安全性。

## 設定方式

### 開發環境（本地開發）

**不需要額外設定** - 預設允許以下本地開發來源：
- `http://localhost:5173` (Vite 預設)
- `http://localhost:3000`
- `http://localhost:5174`
- `http://127.0.0.1:5173`
- `http://127.0.0.1:3000`

### 生產環境（Vercel/Supabase）

在 Supabase Dashboard 設定環境變數 `ALLOWED_ORIGINS`：

1. 前往 **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. 新增 Secret：
   - **Key**: `ALLOWED_ORIGINS`
   - **Value**: 你的生產域名（以逗號分隔）

#### 範例

**單一域名**：
```
ALLOWED_ORIGINS=https://meow-app.vercel.app
```

**多個域名**（主域名 + www）：
```
ALLOWED_ORIGINS=https://meow-app.vercel.app,https://www.meow-app.vercel.app
```

**支援預覽環境**：
```
ALLOWED_ORIGINS=https://meow-app.vercel.app,https://meow-app-git-main.vercel.app,https://*.vercel.app
```

> **注意**：通配符（`*`）支援有限，建議明確列出所有允許的域名。

## 如何取得你的生產域名

### Vercel 部署

1. 部署完成後，Vercel 會提供一個預覽 URL（例如：`https://your-project.vercel.app`）
2. 如果設定了自訂域名，使用自訂域名
3. 將所有需要的域名加入 `ALLOWED_ORIGINS`

### 檢查目前設定

部署 Edge Function 後，可以在 Supabase Dashboard 的 Edge Functions 頁面查看 Secrets。

## 測試 CORS 設定

### 1. 開發環境測試

在本地執行：
```bash
npm run dev
```

應該可以正常呼叫 Edge Function。

### 2. 生產環境測試

使用瀏覽器開發者工具檢查：

1. 開啟 Network 標籤
2. 發送一個請求到 Edge Function
3. 檢查 Response Headers 中的 `Access-Control-Allow-Origin`
4. 應該顯示你的生產域名（而不是 `*`）

### 3. 驗證安全性

嘗試從未授權的域名呼叫 Edge Function，應該會被 CORS 政策阻擋。

## 故障排除

### 問題：CORS 錯誤

**症狀**：瀏覽器控制台顯示 `CORS policy` 錯誤

**解決方案**：
1. 確認 `ALLOWED_ORIGINS` 已正確設定
2. 確認域名格式正確（包含 `https://`）
3. 確認沒有多餘的空格
4. 重新部署 Edge Function

### 問題：本地開發無法使用

**症狀**：本地開發時無法呼叫 Edge Function

**解決方案**：
- 確認使用預設的開發端口（5173 或 3000）
- 或手動設定 `ALLOWED_ORIGINS` 包含你的本地端口

## 安全性建議

1. **生產環境必須設定** `ALLOWED_ORIGINS`，不要使用 `*`
2. **明確列出所有域名**，避免使用通配符
3. **定期檢查** Edge Function 的 CORS 設定
4. **測試**從未授權域名無法呼叫 API
