/**
 * 測試「想你了」場景：一般貓 vs 天使貓的回應差異
 */
import 'dotenv/config';
import { buildSystemPrompt } from '../src/lib/promptBuilder';
import type { Cat } from '../src/types/database';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('❌ 請設定 GEMINI_API_KEY（環境變數或 .env）');
  process.exit(1);
}

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

const TEST_CATS: Cat[] = [
  {
    id: 'test-living',
    user_id: 'test',
    cat_name: '橘橘',
    breed: '橘貓',
    age: 3,
    personality: ['傲嬌'],
    preferences: '曬太陽',
    dislikes: '洗澡',
    habits: '甩尾巴',
    self_ref: '朕',
    status: 'Living',
    avatar_url: null,
    memory_summary: null,
    memory_updated_at: null,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'test-angel',
    user_id: 'test',
    cat_name: '小白',
    breed: '白貓',
    age: 12,
    personality: ['貼心'],
    preferences: '陪伴',
    dislikes: null,
    habits: '呼嚕',
    self_ref: '我',
    status: 'Angel',
    avatar_url: null,
    memory_summary: '使用者自稱為「媽媽」，非常想念小白，經常在晚上想起小白。',
    memory_updated_at: null,
    created_at: '',
    updated_at: '',
  },
];

const TEST_MESSAGES = [
  '想你了',
  '我想你了',
  '好想你',
  '你好嗎？',
  '過得好嗎？',
];

async function testCatResponse(cat: Cat, userMessage: string): Promise<string> {
  const systemPrompt = buildSystemPrompt(cat, cat.memory_summary);

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
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

async function main() {
  console.log('🐱 「想你了」場景測試：一般貓 vs 天使貓\n');
  console.log('='.repeat(70));

  for (const msg of TEST_MESSAGES) {
    console.log(`\n📝 使用者：「${msg}」\n`);
    console.log('-'.repeat(70));

    for (const cat of TEST_CATS) {
      const status = cat.status === 'Angel' ? '天使模式' : '一般模式';
      const personality = cat.personality.join('、');
      
      try {
        const reply = await testCatResponse(cat, msg);
        console.log(`\n${status} - ${cat.cat_name}（${personality}，自稱：${cat.self_ref || '我'}）：`);
        console.log(`「${reply}」`);
        
        // 檢查回應特徵
        const checks = {
          hasSelfRef: reply.includes(cat.self_ref || '我'),
          length: reply.length,
          sentenceCount: reply.split(/[。！？]/).filter(s => s.trim()).length,
          hasAngelTone: cat.status === 'Angel' 
            ? reply.includes('一直都在') || reply.includes('守護') || reply.includes('那邊')
            : !reply.includes('一直都在') && !reply.includes('守護'),
          noPhysicalContact: cat.status === 'Angel'
            ? !reply.includes('蹭腿') && !reply.includes('跳') && !reply.includes('抓')
            : true,
        };
        
        console.log(`   檢查：自稱✅ 字數:${checks.length} 句數:${checks.sentenceCount} ${checks.hasAngelTone ? '✅' : '⚠️'} 無接觸${checks.noPhysicalContact ? '✅' : '❌'}`);
        
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        console.error(`   ❌ 錯誤：${err}`);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    await new Promise((r) => setTimeout(r, 1000));
  }
}

main().catch((err) => {
  console.error('❌ 測試失敗:', err);
  process.exit(1);
});
