# Google 登入「已封鎖存取權」排錯檢查

當使用者看到 Google 顯示「已封鎖存取權」、「xxx.supabase.co 的要求不符合 Google 的「使用安全瀏覽器」政策」時，可依下列步驟排錯與引導。

---

## 1. 確認觸發情境

| 情境 | 說明 |
|------|------|
| **在 App 內建瀏覽器（WebView）** | 從 Line、FB、IG、或某個 App 內點連結打開 Meow，登入時被擋。 |
| **在開發/預覽環境** | 模擬器、Vercel Preview、或某些內嵌 iframe 開登入。 |
| **Supabase OAuth 流程** | 登入會先跳到 `xxx.supabase.co` 再轉 Google；整段在 WebView 內就會被擋。 |

---

## 2. 我們已做的緩解（WebView 偵測）

- **偵測**：`src/lib/browser.ts` 的 `isLikelyWebView()` 會判斷是否可能為內建瀏覽器。
- **行為**：若偵測到 WebView，點「用 Google 登入」時會改為 **在新視窗開啟** OAuth 網址（`window.open`），不導向當前頁，以符合「使用安全瀏覽器」。
- **UI**：登入頁會顯示提示「請在剛開啟的瀏覽器視窗中完成 Google 登入」，以及「若未自動開啟，請點此在瀏覽器中開啟登入頁」。

**排錯時可確認**：在疑似 WebView 環境點「用 Google 登入」後，是否有跳出新視窗／是否出現上述提示。

---

## 3. 給使用者的引導（若仍被擋）

1. **改用系統瀏覽器**：請使用者用 **Chrome、Safari、Edge** 等「真正的」瀏覽器，直接輸入 Meow 網址再登入，不要從 Line/FB 等 App 內建瀏覽器點進去。
2. **若從 App 點連結**：請在連結選單選擇「在瀏覽器中開啟」或「用 Chrome/Safari 開啟」，再在瀏覽器裡登入。
3. **已看到封鎖畫面**：照 Google 頁面建議：「如果這個應用程式提供網頁版，請開啟網路瀏覽器並嘗試透過該網頁登入。」

---

## 4. 開發端可再檢查的項目

- **Supabase 設定**：Dashboard → Authentication → URL Configuration：**Site URL** 與 **Redirect URLs** 需包含正式站網址（例如 `https://your-meow.vercel.app`）。
- **Google Cloud Console**：OAuth 同意畫面的授權網域、OAuth 用戶端「已授權的重新導向 URI」需包含 Supabase 提供的 callback（`https://xxx.supabase.co/auth/v1/callback`）以及你的 Site URL（若有用到）。
- **環境**：正式環境（Vercel Production）的 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 是否正確，避免在錯誤網域或專案下登入。

---

## 5. 小結

| 對象 | 建議動作 |
|------|----------|
| **使用者** | 用 Chrome/Safari 開 Meow 網址再登入；若在 App 內，選「在瀏覽器中開啟」。 |
| **開發** | 確認 Supabase 與 Google OAuth 的網域與 redirect 設定；WebView 情境已由「新視窗開啟登入」與提示文案緩解。 |
