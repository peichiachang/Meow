# 設定指南

此文件包含專案的詳細設定步驟，僅供開發者參考。

## 必要設定

### 1. Supabase 專案

1. 至 [Supabase](https://supabase.com) 建立專案
2. 在 SQL Editor 執行 migration 檔案
3. 取得 Project URL 與 anon key

### 2. Edge Functions

部署 Edge Functions 並設定必要的環境變數。

### 3. 環境變數

複製 `.env.example` 為 `.env`，填入必要的環境變數。

### 4. Google 登入（選用）

設定 Google OAuth 以啟用 Google 登入功能。

## 部署

### Vercel 部署

1. 推送程式碼到 GitHub
2. 在 Vercel 匯入專案
3. 設定環境變數
4. 部署完成後設定 Supabase 的 URL Configuration

詳細步驟請參考專案內部文件。
