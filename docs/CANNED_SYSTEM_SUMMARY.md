# 罐頭回覆系統 — 總整理

## 一、整體流程

```
使用者輸入
    ↓
有命中「貓討厭」詞？ ──是──→ 從「反面罐頭池」(350 則中具反面關鍵字 + 個性符合) 隨機一則
    ↓ 否
有關鍵字？ ──否──→ 改走 AI
    ↓ 是
關鍵字 → 候選罐頭索引
    ↓
個性篩選（罐頭 personalities ⊆ 貓咪 personality）
    ↓
貓討厭的內容 → 排除罐頭內文提到討厭詞的
    ↓
排除「上一則回覆」避免重複
    ↓
貓喜歡的內容 → 提到喜歡詞的罐頭權重 x2
    ↓
隨機一則 → slot 抽換（自稱等）→ 回傳
```

---

## 二、核心檔案

| 檔案 | 職責 |
|------|------|
| `src/data/cannedMessages.ts` | **350 則**罐頭（300 一般 + 50 偏負面），每則含 `personalities[]`、`text` |
| `src/data/keywordCannedTable.ts` | 關鍵字表、喜歡/討厭/反面邏輯、候選篩選、slot 抽換呼叫 |
| `src/data/keywordCannedMessages.ts` | 對外 API：`getKeywordCannedReply(userMessage, personality, options)` |
| `src/data/cannedSlotTaxonomy.ts` | slot 詞庫（subject/address/state/verb/ending/action）、`substituteCannedSlots()` |
| `src/components/ChatPage.tsx` | 呼叫罐頭時傳入 `personality`、`preferences`、`dislikes`、`self_ref`、`excludeTexts` |

---

## 三、貓咪檔案欄位與罐頭的對應

| 欄位 | 用途 |
|------|------|
| **個性** (personality) | 只選「罐頭 personalities ⊆ 貓咪個性」的罐頭；有設個性時，不符就不回罐頭（改走 AI） |
| **自稱** (self_ref) | slot 抽換時，主詞一律用此值（如「朕」）；留空則隨機用本喵/我/本大爺 |
| **喜歡** (preferences) | 罐頭內文提到喜歡詞組 → 該則在候選池權重 x2 |
| **討厭** (dislikes) | ① 罐頭內文提到討厭詞組 → 該則排除 ② **使用者輸入**提到討厭詞組 → 改從「反面罐頭池」選一則 |

---

## 四、罐頭數量與分類

- **一般罐頭**：1–300（關鍵字 + 個性匹配）
- **偏負面罐頭**：301–350（屁孩/粗魯/兇猛/冷淡/聰明/謹慎/話多/傻萌/貼心/熱情/安靜/活潑/膽小/老成/懶散/傲嬌 等單一或組合），用於「使用者提到貓討厭的東西」或情境（家具/天災）

反面關鍵字（用於篩「反面罐頭池」）：  
討厭、不要、才不、別吵、不准、走開、哈氣、絕交、手拿開、敲碗、抓壞、推落、咬住、撞倒、無視、背對、撥弄、踢翻、啃食、抓爛、推倒、炸毛 等。

---

## 五、Slot 抽換（增加變化）

- **詞庫**：`cannedSlotTaxonomy.ts` — subject（本喵/我/本大爺）、address（奴才/鏟屎官/這隻人類/餵飯的）、state、verb、ending、action。
- **規則**：每則罐頭回傳前，將內文中的同類詞替換成詞庫中隨機一個；若貓有填 **自稱**，subject 固定用自稱。
- **括號**：半形/全形皆可辨識。

---

## 六、腳本與指令

| 指令 | 說明 |
|------|------|
| `npm run test:canned` | 驗證「使用者輸入 × 貓咪個性」→ 罐頭回覆的個性皆符合 |
| `npm run classify:canned` | 依 6 類詞庫統計 350 則罐頭，輸出 `docs/canned-taxonomy-classification.json` |
| `npx tsx scripts/print-10-slots.ts` | 產出 10 句 slot 抽換範例（不重複基底） |
| `npm run test:ai` | AI 對話測試（需 ANTHROPIC_API_KEY） |

---

## 七、文件索引

- **關鍵字對應表**：`docs/KEYWORD_CANNED_TABLE.md`
- **罐頭分類統計說明**：`docs/CANNED_TAXONOMY.md`
- **本總整理**：`docs/CANNED_SYSTEM_SUMMARY.md`

---

## 八、下一步建議（見下一份文件）

見 `docs/NEXT_STEPS.md`。
