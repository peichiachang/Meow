# 本地測試：避免每次改 Supabase URL

用手機測試時，Supabase 會導回 localhost，導致連線失敗。

**建議**：直接部署到 Vercel（見 README「部署到 Vercel」），取得固定網址後電腦與手機都能用。

若暫不部署，可用以下方式：

---

## 方式一：使用 ngrok

ngrok 會產生一個固定網址，電腦和手機都能用，Supabase 只需設定一次。

### 1. 安裝 ngrok

```bash
brew install ngrok
```

### 2. 啟動 dev server

```bash
cd /Users/pagechang/Desktop/ProjectCat/cat-ai-chat
npm run dev
```

### 3. 另開終端機，啟動 ngrok

```bash
ngrok http 5173
```

### 4. 取得網址

ngrok 會顯示類似：
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:5173
```

### 5. 在 Supabase 設定

- **Site URL**：`https://abc123.ngrok-free.app`
- **Redirect URLs**：`https://abc123.ngrok-free.app/`

之後電腦和手機都用這個網址，不用再改 Supabase。

**注意**：免費版 ngrok 每次重啟網址會變，需重新更新 Supabase。付費版可保留固定網址。

---

## 方式二：部署到 Vercel

部署後會有固定網址（如 `https://meow-xxx.vercel.app`），Supabase 只需設定一次。

見 README 的部署說明。
