# Meow 實作對照與問題清單

對照 [SDD v1.3](./SDD.md) 檢查目前實作，供 AI coding tool 與開發者參考。

---

## 一、與 SDD 一致的部分

| 項目 | SDD 要求 | 目前實作 | 狀態 |
|------|----------|----------|------|
| AI 模型 | Gemini 2.5 Flash-Lite（測試階段） | Edge Function 與本機測試皆使用 `gemini-2.5-flash-lite` | ✅ |
| System Prompt | 角色設定 + 說話規則 + 記憶摘要 | `promptBuilder.ts` 三部分動態組合，含討厭事物反應 | ✅ |
| 說話規則 | 自稱、不用「主人」、2~4 句、繁體、禁止健康/AI 建議等 | 固定模板注入，另加強「討厭」時情緒反應 | ✅ |
| 個性模板 | 18 種 + 自由輸入 | `personalities.ts` 對應 SDD 2.4，表單可多選 + 自訂 | ✅ |
| 記憶機制 | 每 10 則對話後非同步摘要 | 每 20 則訊息（10 則對話）觸發 `summarize-memory`，不等待 | ✅ |
| 近期對話 | 最近 10 則 | `chatService` 取 `recentMessages.slice(-10)` | ✅ |
| API 參數 | maxOutputTokens 300、temperature 0.9 | Edge Function 與測試腳本一致 | ✅ |
| 貓咪設定欄位 | catName, breed, age, personality, preferences, dislikes, habits, selfRef | 表單與 DB 欄位一致（含 self_ref） | ✅ |
| 多貓與方案 | 免費 1 隻、付費 5 隻 | `plan` 來自 profiles，maxCats 與 message limit 依 plan | ✅ |
| 罐頭 + 個性 | 關鍵字 + 個性篩選、selfRef 替換 | `keywordCannedTable` + slot 抽換（subject = selfRef） | ✅ |
| 切題優先 | 喜歡 → 討厭 → 一般（依個性、關鍵字） | 實作順序與註解一致 | ✅ |
| 開場白 | 時間、等待感、隨機行為、天氣（選填） | `openingLines.ts` 含 weather；`weatherService` 位置＋Open-Meteo | ✅ |
| 每日訊息限制 | 免費 10 則、台灣 00:00 重置 | `useMessageLimit` + `daily_message_counts`，`Asia/Taipei` | ✅ |
| 資料表 | users/profiles, cats, messages | `profiles`（對應 auth.users）、cats、messages、daily_message_counts | ✅ |
| 90 天清理 | 對話保留 90 天 | `cleanup-old-messages` Edge Function（需排程觸發） | ✅ |

---

## 二、與 SDD 的差異或刻意取捨

| 項目 | SDD 記載 | 目前實作 | 說明 |
|------|----------|----------|------|
| **頭像儲存** | Supabase Storage、永久 | **本機 localStorage**（不上傳） | **先維持本機**，後續再實作 Storage；`avatar_url` 仍存在 schema。 |
| **訂閱與付費** | 待規劃 | **僅免費版、一隻貓咪** | **先維持免費版一隻貓咪**；付費與多貓待規劃後實作。 |

---

## 三、錯漏或待補（建議修正）

### 1. 情緒類觸發詞（已決策：單則，隨機罐頭或 AI）

- **原 SDD 4.4**：情緒類為罐頭 + AI 兩則氣泡。
- **決策**：改為**只回一則**；因罐頭切題性不高，**隨機選擇罐頭或 AI**（各 50%），兼顧即時感與情境貼合。
- **實作**：`src/data/triggerCategories.ts` 定義情緒類觸發詞；`ChatPage` 命中時若隨機選罐頭則用罐頭，否則呼叫 AI。

### 2. 罐頭則數（已決策：補至 400 則）

- **SDD**：約 400 則。
- **決策**：新增至 400 則，依現有做法整理（個性、關鍵字、slot 抽換）。
- **狀態**：見五、5.3。

### 3. 開場白與天氣（選填，已決策：實作）

- **SDD 4.4**：開場白可含「外面好像在下雨...」等天氣連結，需位置權限（選填）。
- **決策**：進行實作；需位置授權與天氣 API，選填不強制。

### 4. Edge Function 秘密鍵（已決策：實作部署說明）

- **SDD / 文件**：已改為 `GEMINI_API_KEY`。
- **決策**：部署時須設 `GEMINI_API_KEY`；於 README／部署流程中明確說明並實作檢查或提示。

---

## 四、其餘注意事項

- **profiles 與 users**：SDD 寫「users 表」，實作為 `profiles`（關聯 `auth.users`），語意一致，僅命名不同。
- **訊息 role**：DB 為 `user` / `assistant`，與 SDD 之 user/assistant 一致。
- **罐頭 selfRef**：罐頭庫用「本喵」等佔位，前端以 `slotOverrides.subject`（selfRef）替換，符合 SDD 4.2。
- **絕對禁忌與記憶**：罐頭不得含體重／公斤／瘦身；使用者主動提及則可存入記憶摘要，AI 可於後續對話依記憶自然回應（不主動提起）。

---

## 五、剩餘衝突／錯漏／問題總覽

以下為尚未解決的項目，依類型整理；若採用 SDD v2.0 為準，需一併考量「六、SDD v2.0 對齊待辦」。

### 5.1 邏輯／行為（已決策）

| # | 項目 | 說明 | 狀態 |
|---|------|------|------|
| 1 | **情緒類單則** | 情緒類改為「只回一則」：隨機選擇罐頭或 AI（50/50），避免罐頭切題性不足時仍強制罐頭。 | ✅ 已實作：`triggerCategories.isEmotionalTrigger` + `ChatPage` 情緒類時 `Math.random() < 0.5` 選罐頭否則 AI。 |

### 5.2 資料／內容衝突（已處理）

| # | 項目 | 說明 | 狀態 |
|---|------|------|------|
| 2 | **罐頭與「絕對禁忌」** | SDD 2.6：罐頭不得含個人化資訊如體重、公斤、瘦身；使用者主動提及則可存入記憶，AI 可於後續對話依記憶回應。 | ✅ 已處理：違規罐頭 6 則已改寫（移除體重／公斤／瘦身）；關鍵字表移除「瘦小腹」「52公斤」；`promptBuilder` 已加入絕對禁忌規則並註明「使用者提及可存記憶、AI 可依記憶回應」。 |

### 5.3 規格差異或刻意取捨

| # | 項目 | 說明 | 狀態 |
|---|------|------|------|
| 3 | **頭像儲存** | SDD 為 Supabase Storage；目前本機。 | **先維持本機**，後續再實作 Storage。 |
| 4 | **訂閱／付費** | 訂閱待規劃；目前僅免費版。 | **先維持免費版一隻貓咪**。 |
| 5 | **罐頭則數** | SDD 約 400 則。 | ✅ 已補至 400 則（`cannedMessages.ts`），依現有個性／關鍵字／slot 做法整理。 |
| 6 | **開場白天氣** | SDD 列為選填。 | ✅ 已實作：`weatherService.ts`（Open-Meteo＋位置授權）、`openingLines` 天氣情境、ChatPage 非同步帶入。 |

### 5.4 部署／環境

| # | 項目 | 說明 | 狀態 |
|---|------|------|------|
| 7 | **GEMINI_API_KEY** | 部署時須在 Supabase 設定 Edge Function 秘密鍵。 | ✅ 已實作：README 標註必設、步驟加【必做】、部署完成後提醒確認 Secrets。 |

---

## 六、SDD v2.0 對齊待辦

若以 **SDD v2.0**（PWA、語法框架、年齡濾鏡、執行規則）為目標，尚有下列待辦（與「五」不重複）。

| # | 項目 | SDD v2.0 要求 | 目前狀態 | 建議 |
|---|------|----------------|----------|------|
| 1 | **ownerRef** | 貓對使用者的稱呼（奴才、你、鏟屎官），表單與 schema 皆有。 | DB、型別、表單皆無 `owner_ref`；prompt 固定「你」。 | 新增 `owner_ref` 欄位與表單；prompt 改為使用 `ownerRef` 取代固定「你」；罐頭若有「你／奴才」佔位可一併替換。 |
| 2 | **語法強制框架** | 2.3 公式：\[自稱\]+\[對象稱呼\]+\[年齡語氣\]+…；變數含 cat_self_name、owner_ref、age_stage、selected_tags。 | 未在 system prompt 中強制此公式。 | 在 prompt 或後處理中納入語法框架與變數說明。 |
| 3 | **全生命週期年齡濾鏡** | 2.5：Kitten～Super Senior 對應語氣與核心動作。 | 未依年齡階段調整語氣或動作。 | 依 `age` 推算階段，將對應描述注入 system prompt。 |
| 4 | **執行規則擴充** | 2.6：Web 感知（分頁嘲諷）、商業防護（付費/肉泥統一回覆）、絕對禁忌（體重/公斤/瘦身）、時區 CST。 | 僅部分存在（健康、角色揭露）；無 Web 感知、商業防護、絕對禁忌、時區。 | 在 system prompt 固定注入上述執行規則。 |
| 5 | **PWA** | 平台為 Progressive Web App。 | 無 manifest、service worker。 | 新增 PWA 設定（manifest、service worker、必要 meta）。 |
| 6 | **Vercel AI SDK** | 技術堆疊列為 Vercel AI SDK（streaming 等）。 | 未使用；目前直接呼叫 Edge Function。 | 若採用，前端改為透過 Vercel AI SDK 串接；否則在 SDD 註明「暫不採用」。 |

---

*若實作或 SDD 有變更，請同步更新本文件與 [SDD.md](./SDD.md)。*
