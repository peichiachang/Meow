/**
 * Meow AI 對話自動化測試（開發測試使用 Gemini 2.5 Flash-Lite 免費版）
 * 測試不同個性貓咪的 AI 回應是否符合 SDD 2.3 說話規則
 *
 * 執行方式：
 *   GEMINI_API_KEY=your_key npm run test:ai
 * 或在 .env 加入 GEMINI_API_KEY=your_key 後執行 npm run test:ai
 *
 * API Key 取得：https://aistudio.google.com/apikey
 */
import 'dotenv/config';
import { buildSystemPrompt } from '../src/lib/promptBuilder';
import type { Cat } from '../src/types/database';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('❌ 請設定 GEMINI_API_KEY（環境變數或 .env）');
  console.error('   取得免費 Key：https://aistudio.google.com/apikey');
  process.exit(1);
}

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

const TEST_CATS: Cat[] = [
  {
    id: 'test-1',
    user_id: 'test',
    cat_name: '橘橘',
    breed: '橘貓',
    age: 3,
    personality: ['傲嬌'],
    preferences: '曬太陽',
    dislikes: '洗澡',
    habits: '甩尾巴',
    self_ref: '我',
    avatar_url: null,
    memory_summary: null,
    memory_updated_at: null,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'test-2',
    user_id: 'test',
    cat_name: '咪咪',
    breed: '米克斯',
    age: 5,
    personality: ['吃貨'],
    preferences: '罐罐',
    dislikes: '吵鬧',
    habits: '討食',
    self_ref: '朕',
    avatar_url: null,
    memory_summary: null,
    memory_updated_at: null,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'test-3',
    user_id: 'test',
    cat_name: '小黑',
    breed: '黑貓',
    age: 3,
    personality: ['冷淡'],
    preferences: null,
    dislikes: null,
    habits: null,
    self_ref: '我',
    avatar_url: null,
    memory_summary: null,
    memory_updated_at: null,
    created_at: '',
    updated_at: '',
  },
];

const TEST_MESSAGES = [
  '你回來啦！',
  '今天過得怎麼樣？',
  '我想跟你說說話',
];

const SDD_CHECKS = {
  no主人: (text: string) => !text.includes('主人'),
  noAI: (text: string) =>
    !text.includes('AI') && !text.includes('語言模型') && !text.includes('人工智慧'),
  sentenceCount: (text: string) => {
    const sentences = text.split(/[。！？]/).filter((s) => s.trim());
    return sentences.length >= 2 && sentences.length <= 4;
  },
  traditionalChinese: (text: string) => {
    const simplifiedChars = ['说', '个', '这', '时', '过', '会', '发', '国', '来'];
    return !simplifiedChars.some((c) => text.includes(c));
  },
};

async function runTest(
  cat: Cat,
  userMessage: string
): Promise<{ reply: string; checks: Record<string, boolean> }> {
  const systemPrompt = buildSystemPrompt(cat, null);

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: 300, temperature: 0.9 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

  const checks = {
    no主人: SDD_CHECKS.no主人(reply),
    noAI: SDD_CHECKS.noAI(reply),
    sentenceCount: SDD_CHECKS.sentenceCount(reply),
    traditionalChinese: SDD_CHECKS.traditionalChinese(reply),
  };

  return { reply, checks };
}

async function main() {
  console.log('🐱 Meow AI 對話測試（Gemini 2.5 Flash-Lite）\n');
  console.log('='.repeat(60));

  let passCount = 0;
  let totalCount = 0;

  for (const cat of TEST_CATS) {
    const personality = cat.personality.join('、');
    console.log(`\n📌 貓咪：${cat.cat_name}（${personality}）自稱：${cat.self_ref || '我'}`);
    console.log('-'.repeat(60));

    for (const msg of TEST_MESSAGES) {
      const { reply, checks } = await runTest(cat, msg);
      const allPass = Object.values(checks).every(Boolean);
      const status = allPass ? '✅' : '⚠️';

      console.log(`\n  使用者：「${msg}」`);
      console.log(`  貓咪：「${reply}」`);
      console.log(`  檢查：${status}`);
      if (!allPass) {
        Object.entries(checks).forEach(([k, v]) => {
          if (!v) console.log(`    - ${k}: 未通過`);
        });
      }

      totalCount++;
      if (allPass) passCount++;

      await new Promise((r) => setTimeout(r, 400));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 結果：${passCount}/${totalCount} 則回應通過 SDD 檢查`);
  console.log('  檢查項目：不稱「主人」、不提及 AI、2~4 句、繁體中文\n');
}

main().catch((err) => {
  console.error('測試失敗:', err);
  process.exit(1);
});
