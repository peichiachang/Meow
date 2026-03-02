/**
 * 罐頭對話驗證腳本
 * 確認「使用者輸入 + 貓咪個性」產生的罐頭回覆：
 * 1. 有命中關鍵字時會回傳罐頭（或符合個性時）
 * 2. 回傳的罐頭其 personalities 全部在貓咪個性內（符合貓咪檔案）
 *
 * 執行：npm run test:canned
 */
import { getKeywordCannedReply } from '../src/data/keywordCannedMessages';
import { CANNED_MESSAGES } from '../src/data/cannedMessages';

function findCannedIndex(text: string): number {
  const i = CANNED_MESSAGES.findIndex((m) => m.text === text);
  return i;
}

function replyMatchesCatPersonality(replyText: string, catPersonality: string[] | null): boolean {
  const idx = findCannedIndex(replyText);
  if (idx === -1) return false;
  const msg = CANNED_MESSAGES[idx];
  if (msg.personalities.length === 0) return true;
  if (!catPersonality || catPersonality.length === 0) return true;
  const catSet = new Set(catPersonality);
  return msg.personalities.every((p) => catSet.has(p));
}

type Case = {
  userMessage: string;
  personality: string[] | null;
  description: string;
  expectReply: boolean; // 預期是否應有罐頭（有關鍵字且可能有符合個性）
};

const TEST_CASES: Case[] = [
  { userMessage: '睡覺了嗎', personality: ['貼心', '傻萌'], description: '睡覺 + 貼心傻萌', expectReply: true },
  { userMessage: '睡覺了嗎', personality: ['傲嬌'], description: '睡覺 + 傲嬌', expectReply: true },
  { userMessage: '吃飯了嗎', personality: ['吃貨'], description: '吃飯 + 吃貨', expectReply: true },
  { userMessage: '吃飯了嗎', personality: ['冷淡', '老成'], description: '吃飯 + 冷淡老成（若無此組合罐頭則 null）', expectReply: false },
  { userMessage: '我回來了', personality: ['黏人'], description: '回來 + 黏人', expectReply: true },
  { userMessage: '回來了', personality: ['傲嬌'], description: '回來 + 傲嬌', expectReply: true },
  { userMessage: '在嗎', personality: ['話多'], description: '在嗎 + 話多', expectReply: true },
  { userMessage: '好累喔', personality: ['貼心'], description: '累 + 貼心', expectReply: true },
  { userMessage: '想睡了', personality: ['冷淡'], description: '想睡 + 冷淡', expectReply: true },
  { userMessage: '罐罐', personality: ['吃貨', '屁孩'], description: '罐罐 + 吃貨屁孩', expectReply: true },
  { userMessage: '早安', personality: ['活潑'], description: '早安 + 活潑（目前無「早安」內容罐頭則 null）', expectReply: false },
  { userMessage: '沒有關鍵字的一句話', personality: ['傲嬌'], description: '無關鍵字', expectReply: false },
  { userMessage: '睡覺了嗎', personality: [], description: '睡覺 + 無個性', expectReply: true },
  { userMessage: '吃飯', personality: ['吃貨', '兇猛'], description: '吃飯 + 吃貨兇猛', expectReply: true },
];

let passed = 0;
let failed = 0;
const runsPerCase = 8; // 每組跑多次（因隨機）以抽查多種回覆

console.log('=== 罐頭對話驗證：使用者輸入 × 貓咪個性 → 回覆是否符合 ===\n');

for (const tc of TEST_CASES) {
  const replies = new Set<string>();
  let hasNull = false;
  for (let i = 0; i < runsPerCase; i++) {
    const reply = getKeywordCannedReply(tc.userMessage, tc.personality, {
      skipSlotSubstitution: true,
    });
    if (reply === null) hasNull = true;
    else replies.add(reply);
  }

  const anyReply = replies.size > 0 || !hasNull ? false : true;
  const gotReply = replies.size > 0;
  const expectMatch = tc.expectReply;

  // 若有回覆，檢查每一則是否都符合貓咪個性
  let allMatch = true;
  const badReplies: string[] = [];
  for (const text of replies) {
    if (!replyMatchesCatPersonality(text, tc.personality)) {
      allMatch = false;
      badReplies.push(text.slice(0, 50) + '...');
    }
  }

  const ok = (expectMatch ? gotReply : true) && allMatch;
  if (ok) {
    passed++;
    console.log(`✅ [${tc.description}] "${tc.userMessage}" + [${tc.personality?.join(',') ?? '無'}]`);
    if (gotReply) console.log(`   回覆數: ${replies.size} 則，皆符合個性`);
    else if (!expectMatch) console.log('   無罐頭（符合預期）');
  } else {
    failed++;
    console.log(`❌ [${tc.description}] "${tc.userMessage}" + [${tc.personality?.join(',') ?? '無'}]`);
    if (!gotReply && expectMatch) console.log('   預期有罐頭但得到 null');
    if (!allMatch) console.log('   以下回覆的 personalities 與貓咪個性不符:', badReplies);
  }
}

console.log('\n--- 結果 ---');
console.log(`通過: ${passed} / ${TEST_CASES.length}`);
if (failed > 0) {
  console.log(`失敗: ${failed}`);
  process.exit(1);
}
console.log('全部符合：使用者對話與貓咪罐頭回覆的個性篩選正確。');
