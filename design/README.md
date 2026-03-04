# Meow 設計檔（Pencil.dev）

此資料夾放 Meow web app 的 `.pen` 設計檔，方便用 Pencil 視覺調整 UI 後再對回程式碼。

## 檔案對應

| .pen 檔 | 對應程式 |
|--------|----------|
| `meow-main.pen` | 首頁：`src/components/MainPage.tsx`、`MainPage.css` |

## 使用方式

1. **在 Cursor 或 Pencil 開啟** `design/meow-main.pen`。
2. 在 Pencil 畫布上調整版面、顏色、字級、間距等。
3. **套回程式碼**（擇一）：
   - 用 Pencil 的 **Design → Code** 匯出 React/TS，再貼到或對照 `MainPage.tsx` / `MainPage.css`。
   - 對照 .pen 的視覺，手動改 `MainPage.tsx`、`MainPage.css`。

## 若看到的是 pencil-new.pen

若 Pencil 目前開啟的是未命名檔（例如 `pencil-new.pen`），請在 Pencil 裡 **另存為** `design/meow-main.pen`，之後就用同一個 .pen 檔延續調整與版控。
