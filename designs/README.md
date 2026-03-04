# 設計稿 .pen 檔案

此資料夾用於存放 Pencil 設計檔，方便在 Pencil 中調整 UI 後再套回程式。

## 檔案說明

- **pages.pen** — 除主畫面（Main）以外的所有頁面：
  - **AuthPage**：登入／註冊頁（標題、表單、Google 登入、切換註冊／登入、免責聲明）
  - **CatSetupPage**：設定／編輯貓咪頁（返回、標題、表單區塊：頭像、名字、個性、送出按鈕等）
  - **ChatPage**：聊天頁（頂部返回與貓咪切換、訊息區、輸入框與送出按鈕）

三個頁面在畫布上由左至右並排（Auth → CatSetup → Chat），方便一次預覽與修改。

## 如何開啟

1. 在 Cursor 中安裝並啟用 Pencil 外掛（pencil.dev）。
2. 用 Pencil 開啟此專案中的 `designs/pages.pen`（絕對路徑：`專案根目錄/designs/pages.pen`）。
3. 在 Pencil 中調整版面、顏色、字級、間距等，存檔後再依設計更新對應的 React 元件與 CSS。

## 與程式的對應

| .pen 頁面   | React 元件      | 樣式檔           |
|------------|-----------------|------------------|
| AuthPage   | `AuthPage.tsx`  | `AuthPage.css`   |
| CatSetupPage | `CatSetupPage.tsx` | `CatSetupPage.css` |
| ChatPage   | `ChatPage.tsx`  | `ChatPage.css`   |

主畫面（Main）的設計若已放在其他 .pen（例如 `pencil-new.pen`），可繼續在該檔內編輯，或之後再整合到同一份設計檔。
