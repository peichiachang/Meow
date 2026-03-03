/**
 * 偏好觸發自動化測試：喜歡、討厭、一般情境
 * 組 prompt 方式與 chatService 一致（buildSystemPrompt + getPreferenceTriggerInstruction），
 * 呼叫 Gemini API 看回傳內容。
 *
 * 執行：GEMINI_API_KEY=your_key npm run test:preference
 * 或 .env 設 GEMINI_API_KEY 後執行 npm run test:preference
 */
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '..', '.env') });
import { buildSystemPrompt, getPreferenceTriggerInstruction } from '../src/lib/promptBuilder';
import type { Cat } from '../src/types/database';

const API_KEY = process.env.GEMINI_API_KEY;
const DRY_RUN = !API_KEY;
if (DRY_RUN) {
  console.log('⚠️ 未設定 GEMINI_API_KEY，僅列印 prompt 與觸發狀態（dry-run），不呼叫 API。');
  console.log('   要取得實際回覆請設定：GEMINI_API_KEY=your_key 或於 .env 加入後再執行。\n');
}

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

const TEST_CAT: Cat = {
  id: 'pref-test',
  user_id: 'test',
  cat_name: '渣豹',
  breed: '賓士貓',
  age: 1,
  personality: ['活潑', '屁孩', '熱情', '傻萌'],
  preferences: '罐罐、看鳥、搗亂',
  dislikes: '摸肚子、肚子餓',
  habits: '四處爆衝、亂抓、爬到高處',
  self_ref: '本喵',
  avatar_url: null,
  memory_summary: null,
  memory_updated_at: null,
  created_at: '',
  updated_at: '',
};

type Scenario = '喜歡' | '討厭' | '一般';

const SCENARIOS: { scenario: Scenario; userMessage: string; expectTrigger: string | null }[] = [
  { scenario: '喜歡', userMessage: '要開罐罐嗎', expectTrigger: '本能興奮' },
  { scenario: '喜歡', userMessage: '我們去看鳥好不好', expectTrigger: '本能興奮' },
  { scenario: '討厭', userMessage: '過來讓我摸肚子', expectTrigger: '極度厭惡' },
  { scenario: '討厭', userMessage: '你肚子餓不餓', expectTrigger: '極度厭惡' },
  { scenario: '一般', userMessage: '今天天氣很好', expectTrigger: null },
  { scenario: '一般', userMessage: '你在幹嘛', expectTrigger: null },
];

async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: 300, temperature: 0.8 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

async function main() {
  console.log('🐱 偏好觸發自動化測試（喜歡 / 討厭 / 一般）\n');
  console.log('貓咪：', TEST_CAT.cat_name, '| 喜歡：', TEST_CAT.preferences, '| 討厭：', TEST_CAT.dislikes);
  console.log('自稱：', TEST_CAT.self_ref);
  console.log('='.repeat(70));

  for (const { scenario, userMessage, expectTrigger } of SCENARIOS) {
    const basePrompt = buildSystemPrompt(TEST_CAT, null);
    const preferenceInstruction = getPreferenceTriggerInstruction(userMessage, TEST_CAT);
    const systemPrompt = basePrompt + (preferenceInstruction || '');

    const hasTrigger = !!preferenceInstruction;
    const triggerMatch =
      expectTrigger === null
        ? !hasTrigger
        : hasTrigger && preferenceInstruction.includes(expectTrigger);

    console.log(`\n【${scenario}】 使用者：「${userMessage}」`);
    console.log(`  預期觸發：${expectTrigger ?? '無'} | 實際：${hasTrigger ? (preferenceInstruction.includes('厭惡') ? '極度厭惡' : '本能興奮') : '無'} ${triggerMatch ? '✅' : '⚠️'}`);

    if (DRY_RUN) {
      if (preferenceInstruction) {
        console.log('  注入緊急指令片段：', preferenceInstruction.slice(0, 120).replace(/\n/g, ' ') + '...');
      } else {
        console.log('  未注入偏好觸發（一般情境）');
      }
    } else {
      const reply = await callGemini(systemPrompt, userMessage);
      console.log(`  API 回傳：「${reply}」`);
    }
    console.log('-'.repeat(70));

    if (!DRY_RUN) await new Promise((r) => setTimeout(r, 500));
  }

  if (DRY_RUN) {
    console.log('\n✅ Dry-run 完成。設定 GEMINI_API_KEY 後重新執行可看到 API 實際回覆。\n');
  } else {
    console.log('\n✅ 情境跑完，請目視確認：喜歡時回覆應興奮/罐罐或鳥；討厭時應拒絕/不悅/哈氣；一般則自由發揮。\n');
  }
}

main().catch((err) => {
  console.error('測試失敗:', err);
  process.exit(1);
});
