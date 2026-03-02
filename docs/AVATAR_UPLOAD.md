# 貓咪頭像（本機儲存）

## 功能說明

- 在「設定你的貓咪」或「編輯貓咪」表單中可選擇貓咪照片作為頭像。
- 支援 JPG、PNG、WebP、GIF，單檔 3MB 以內。
- **頭像僅儲存於本機**（瀏覽器 localStorage），不會上傳到伺服器。
- 頭像會顯示在主畫面貓咪卡片與聊天頁側邊頭像。

## 注意事項

- 頭像只存在目前裝置；換裝置或清除網站資料後頭像會消失。
- 若儲存空間已滿（localStorage 約 5–10MB／站點），請選擇較小或較少張頭像。

## 程式位置

- 本機頭像邏輯：`src/services/localAvatarService.ts`（讀寫 localStorage、縮圖與 JPEG 壓縮）
- 表單 UI：`src/components/CatSetupPage.tsx`（預覽、選擇圖片、移除、送出時存本機）
