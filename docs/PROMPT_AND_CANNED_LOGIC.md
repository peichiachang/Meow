# Prompt System 與罐頭訊息出現邏輯

本文件說明目前 Web App 的 **Prompt 寫法** 與 **罐頭訊息（canned message）的出現邏輯**。

---

## 一、Prompt System 寫法

### 1.1 流程位置

- **檔案**：`src/lib/promptBuilder.ts`、`src/services/chatService.ts`
- **時機**：每次呼叫 AI（Edge Function）前，在 `sendChatMessage()` 內組好 `systemPrompt` 再送出。

### 1.2 組成結構

最終送給 AI 的 **System Prompt** = 以下三者依序串接：

```
[1] 角色區（buildSystemPrompt 的 roleSection）
[2] 說話規則（SPEAKING_RULES，含自稱替換）
[3] 記憶摘要（若有 memorySummary）
[4] （可選）偏好觸發【緊急指令】（getPreferenceTriggerInstruction）
```

- **[1][2][3]** 由 `buildSystemPrompt(cat, memorySummary)` 產出。
- **[4]** 由 `getPreferenceTriggerInstruction(userMessage, cat)` 產出；有觸發時才串在後面。

### 1.3 角色區（Role Section）（對應 SDD 2.4）

- 固定包含：
  - 名字、品種、年齡、**固定自稱**（self_ref）、**對使用者的稱呼**（目前固定「你」）、個性（來自 `PERSONALITY_TEMPLATES`）、**偏好（喜歡）**、**討厭**、習慣動作。
- **SDD 2.5 年齡階段**：由 `age`（歲）推算階段（Kitten / Junior / Adult / Mature / Senior / Super Senior），並注入該階段的**語氣特徵**與**核心動作**（例如幼貓：飛撲、蹦跳、歪頭；成貓：理毛、優雅蹭腿）。
- 並有一段 **【切題回應】** 說明（喜歡／討厭時回覆要切題）。

### 1.4 說話規則（SPEAKING_RULES）（對應 SDD 2.3、2.6）

- **【結構約束】SDD 2.3 語法框架**：每則回覆須符合公式  
  `[固定自稱] + [對象稱呼] + [年齡語氣偏好] + [性格標籤選詞] + [受詞] + [結尾口頭禪] + （動作描述）`，長度 2～3 句。固定自稱一律 `{selfRef}`，對象稱呼「你」。
- **【商業防護】**：被問到付費、訂閱、肉泥等，統一回覆「身價評估中」或「肉泥還在路上」。
- **【絕對禁忌】**：禁止主動提體重、公斤、瘦身。
- **【時區】**：時間判斷強制使用台灣標準時間（CST，UTC+8）。
- **【健康／角色】**：不主動提飲食／就醫建議；不聲稱是 AI；只扮演貓咪。
- **【切題】**：回覆須針對使用者上一句；若提到偏好或討厭，要明顯表現喜歡或討厭。
- **【Web 感知】**：情境合適時可嘲諷「那排分頁比我好看嗎？」等。

### 1.5 偏好觸發（意圖過濾器）

- **函式**：`getPreferenceTriggerInstruction(userInput, cat)`（`promptBuilder.ts`）。
- **輸入**：使用者當則訊息 `userInput`、貓檔案 `cat`（內含 `preferences`、`dislikes` 字串）。
- **詞組解析**：`preferences` / `dislikes` 依 `、`、`,`、`，`、空白拆成詞組（例如 `"罐罐、看鳥、搗亂"` → `["罐罐","看鳥","搗亂"]`）。
- **比對方式**：`userInput.trim().includes(詞組)`；先檢查討厭，再檢查喜歡。
- **優先級**：
  1. **討厭**：任一討厭詞組被使用者輸入「包含」→ 回傳一段【緊急指令】文字，要求「極度反感且防衛」、必須使用 (哈氣)、(耳朵後壓)、(伸爪)、(跑掉) 等動作。
  2. **喜歡**：未觸發討厭時，任一喜歡詞組被包含 → 回傳另一段【緊急指令】，要求「極度興奮且專注」、必須使用 (瞳孔放大)、(尾巴快速勾動)、(興奮蹦跳)、(發出喀喀聲) 等動作。
  3. 都沒有 → 回傳空字串，不追加。

在 `chatService.sendChatMessage()` 內：

```ts
let systemPrompt = buildSystemPrompt(cat, memorySummary);
const preferenceInstruction = getPreferenceTriggerInstruction(userMessage, cat);
if (preferenceInstruction) systemPrompt += preferenceInstruction;
```

因此 **Prompt 寫法** = 上述 [1]～[4] 的完整字串，且「喜歡／討厭」會在傳給 AI 前就透過【緊急指令】加權。

---

## 二、罐頭訊息的出現邏輯

### 2.1 流程位置

- **檔案**：`src/components/ChatPage.tsx`（`handleSend`）、`src/data/keywordCannedMessages.ts`、`src/data/keywordCannedTable.ts`、`src/data/triggerCategories.ts`
- **時機**：使用者送出訊息後，在決定「要回罐頭還是呼叫 AI」時使用。

### 2.2 高層決策（ChatPage）

在 `handleSend` 裡：

1. 先取 **最近兩則助理回覆** 的內容，當作 `excludeTexts`（避免同一輸入重複回同一則罐頭）。
2. 呼叫 **罐頭匹配**：
   ```ts
   cannedReply = getKeywordCannedReply(text, selectedCat.personality, {
     excludeTexts,
     slotOverrides: { subject: selectedCat.self_ref },
     preferences: selectedCat.preferences,
     dislikes: selectedCat.dislikes,
   });
   ```
3. **是否為情緒類觸發**：`isEmotionalTrigger(text)`（見 2.3）。
4. **決定回覆來源**：
   - **若為情緒類**（好累、好難過、好煩、無聊等）：
     - 若有罐頭且隨機 < 0.5 → 用 **罐頭**；
     - 否則 → 用 **AI**。
     - 只回一則。
   - **若非情緒類**：
     - 若有罐頭（`cannedReply !== null`）→ 用 **罐頭**；
     - 否則 → 用 **AI**。

因此：**罐頭出現邏輯** = 先看是否情緒類（隨機罐頭/AI），否則「有匹配罐頭就用罐頭，沒有就用 AI」。

### 2.3 情緒類觸發（triggerCategories）

- **檔案**：`src/data/triggerCategories.ts`
- **函式**：`isEmotionalTrigger(userMessage)`
- **用途**：判斷使用者是否在表達「心情／累／難過／煩／無聊」等。
- **實作**：將訊息正規化（去空白、小寫）後，檢查是否包含預設的情緒短語（如「我好累」「好累」「好難過」「好煩」「好無聊」「無聊死了」等）。
- **效果**：情緒類時不強制罐頭，約 50% 罐頭、50% AI，避免罐頭切題性不足時仍只回罐頭。

### 2.4 罐頭匹配細節（keywordCannedTable）

- **函式**：`pickCannedByKeywordAndPersonality(userMessage, personality, excludeTexts, ..., preferences, dislikes)`
- **步驟概要**：
  1. **詞組**：將貓的 `preferences`、`dislikes` 字串拆成詞組（同 prompt 的 `parsePreferencePhrases` 邏輯）。
  2. **是否提到喜歡／討厭**：`userMessage.includes(詞組)` 判斷使用者是否提到貓的喜歡或討厭內容。
  3. **候選池選擇（優先級）**：
     - **喜歡（切題）**：若使用者提到喜歡內容 → 先從「對應喜歡主題」的罐頭池篩選（再依個性篩；篩完可放寬回切題池）。
     - **討厭（切題）**：若未選到且使用者提到討厭內容 → 先找「回覆內文含討厭切題關鍵字」的罐頭，或對應負面罐頭池；再依個性篩；若仍無則用一般關鍵字候選，且會排除「罐頭內文提到討厭詞」的罐頭。
     - **一般**：其餘情況 → 依 **關鍵字對應表**（`MASTER_KEYWORDS`、`USER_KEYWORD_TO_CONTENT`）匹配罐頭編號，再以個性篩選；若有設定討厭，會排除罐頭內文包含討厭詞組的選項。
  4. **排除最近回覆**：從候選池中排除 `excludeTexts` 的內容，避免重複。
  5. **喜歡加權**：若貓有設定喜歡，罐頭內文提到喜歡詞組者會在多選一時被加權（重複放入 pool）。
  6. **隨機取一**：從最終 pool 隨機選一則，再套用 **slot 抽換**（如自稱換成貓的 `self_ref`）後回傳。

因此：**罐頭出現邏輯** 在底層 = 關鍵字＋喜歡／討厭切題＋個性篩選＋排除最近＋喜歡加權＋slot 替換。

---

## 三、對照總表

| 項目 | 說明 |
|------|------|
| **Prompt 由誰組** | `buildSystemPrompt(cat, memorySummary)` + 若有觸發則 `getPreferenceTriggerInstruction(userMessage, cat)` 追加。 |
| **何時加「緊急指令」** | 在 `sendChatMessage()` 內，組完 base system 後、送 API 前，依「使用者當則輸入」是否包含喜歡／討厭詞組決定是否追加。 |
| **罐頭何時出現** | 非情緒類：有匹配罐頭就用罐頭，否則 AI。情緒類：約 50% 罐頭 / 50% AI。 |
| **罐頭匹配維度** | 關鍵字、喜歡／討厭切題、個性、排除最近回覆、喜歡加權、slot 替換。 |
| **喜歡／討厭在 Prompt** | 角色區列出「偏好（喜歡）」「討厭」；說話規則要求切題；觸發時再追加【緊急指令】與動作池。 |
| **喜歡／討厭在罐頭** | 用來選「切題」罐頭池、排除不該出現的罐頭、以及對喜歡相關罐頭加權。 |

---

*文件對應程式狀態：依目前 `main` 分支之實作為準。*
