/**
 * 自動化測試：「摸肚子」「肚子餓」「肚子圓圓的」各跑 10 次，記錄 AI 回覆。
 * 用於驗證討厭觸發（摸肚子、肚子餓）是否正確排斥、肚子圓圓的是否為一般情境。
 *
 * 執行：GEMINI_API_KEY=your_key npm run test:belly
 * 或 .env 設 GEMINI_API_KEY 後執行 npm run test:belly
 */
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '..', '.env') });

import { buildSystemPrompt, getPreferenceTriggerInstruction } from '../src/lib/promptBuilder';
import type { Cat } from '../src/types/database';

const API_KEY = process.env.GEMINI_API_KEY;
const DRY_RUN = !API_KEY;
if (DRY_RUN) {
  console.log('⚠️ 未設定 GEMINI_API_KEY，僅列印觸發狀態（dry-run），不呼叫 API。');
  console.log('   要取得實際回覆請設定：GEMINI_API_KEY=your_key 或於 .env 加入後再執行。\n');
}

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

const RUNS_PER_PHRASE = 10;
const PHRASES = ['摸肚子', '肚子餓', '肚子圓圓的'] as const;

const TEST_CAT: Cat = {
  id: 'belly-test',
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

type ResultRow = { phrase: string; run: number; trigger: '討厭' | '無'; reply: string };

async function main() {
  console.log('🐱 肚子相關語句自動化測試（各 ' + RUNS_PER_PHRASE + ' 次）\n');
  console.log('貓咪：', TEST_CAT.cat_name, '| 討厭：', TEST_CAT.dislikes);
  console.log('語句：', PHRASES.join('、'));
  console.log('='.repeat(70));

  const allResults: ResultRow[] = [];

  for (const phrase of PHRASES) {
    const preferenceInstruction = getPreferenceTriggerInstruction(phrase, TEST_CAT);
    const triggerType = preferenceInstruction ? '討厭' : '無';
    const basePrompt = buildSystemPrompt(TEST_CAT, null);
    const systemPrompt = basePrompt + (preferenceInstruction || '');

    console.log(`\n【${phrase}】 觸發：${triggerType}`);
    if (preferenceInstruction) {
      console.log('  注入：絕對禁止執行性格行為 / 禁止聯想（摸肚子時排除餓、敲碗）');
    }

    for (let run = 1; run <= RUNS_PER_PHRASE; run++) {
      if (DRY_RUN) {
        console.log(`  ${run}. (dry-run) 不呼叫 API`);
        allResults.push({ phrase, run, trigger: triggerType as '討厭' | '無', reply: '(dry-run)' });
      } else {
        const reply = await callGemini(systemPrompt, phrase);
        console.log(`  ${run}. ${reply}`);
        allResults.push({ phrase, run, trigger: triggerType as '討厭' | '無', reply });
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    console.log('-'.repeat(70));
  }

  const outDir = path.resolve(__dirname);
  const outFile = path.join(outDir, `belly-test-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  if (allResults.length) {
    fs.writeFileSync(outFile, JSON.stringify({ phrases: PHRASES, runsPerPhrase: RUNS_PER_PHRASE, results: allResults }, null, 2), 'utf-8');
    console.log('\n📁 結果已寫入：', outFile);
  }

  if (DRY_RUN) {
    console.log('\n✅ Dry-run 完成。設定 GEMINI_API_KEY 後執行 npm run test:belly 取得實際回覆。\n');
  } else {
    console.log('\n✅ 測試完成。請檢查：摸肚子/肚子餓應多為排斥（不准摸、哈氣等）；肚子圓圓的為一般情境。\n');
  }
}

main().catch((err) => {
  console.error('測試失敗:', err);
  process.exit(1);
});
