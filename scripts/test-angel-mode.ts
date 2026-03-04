/**
 * 測試 SDD v2.0 天使模式與 v3.2 Prompt Builder
 * 驗證：
 * 1. Living 狀態的貓咪 prompt 是否正確
 * 2. Angel 狀態的貓咪 prompt 是否包含去生理化指令
 * 3. 動態稱呼機制是否正確
 * 4. 錯誤處理是否根據狀態顯示不同訊息
 */
import 'dotenv/config';
import { buildSystemPrompt } from '../src/lib/promptBuilder';
import type { Cat } from '../src/types/database';

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

function checkPrompt(prompt: string, cat: Cat): {
  hasAngelMode: boolean;
  hasPhysiologicalBan: boolean;
  hasDynamicCalling: boolean;
  hasMemoryGuidance: boolean;
  hasPhysicalRestrictions: boolean;
} {
  const isAngel = cat.status === 'Angel';
  
  return {
    // 檢查是否包含天使模式指令
    hasAngelMode: isAngel 
      ? prompt.includes('天使模式') || prompt.includes('Angel') || prompt.includes('去生理化')
      : !prompt.includes('天使模式專屬規範'),
    
    // 檢查是否禁止生理需求描述（僅天使模式）
    hasPhysiologicalBan: isAngel
      ? prompt.includes('禁止生理描述') || prompt.includes('嚴禁提到餓') || prompt.includes('去生理化')
      : true, // Living 模式不需要這個檢查
    
    // 檢查是否包含動態稱呼機制（v3.2）
    hasDynamicCalling: prompt.includes('動態稱呼') || prompt.includes('媽媽、哥哥、姊姊'),
    
    // 檢查是否包含記憶使用指南（v3.2）
    hasMemoryGuidance: prompt.includes('長期記憶庫') || prompt.includes('執行備註'),
    
    // 檢查是否包含物理限制（禁止擬人動作）
    hasPhysicalRestrictions: prompt.includes('拍肩膀') || prompt.includes('握手') || prompt.includes('擊掌'),
  };
}

async function main() {
  console.log('🐱 SDD v2.0 & v3.2 功能測試\n');
  console.log('='.repeat(70));

  let passCount = 0;
  let totalChecks = 0;

  for (const cat of TEST_CATS) {
    const status = cat.status === 'Angel' ? '天使模式' : '一般模式';
    console.log(`\n📌 貓咪：${cat.cat_name}（${status}）`);
    console.log(`   自稱：${cat.self_ref || '我'}`);
    if (cat.memory_summary) {
      console.log(`   記憶：${cat.memory_summary.substring(0, 50)}...`);
    }
    console.log('-'.repeat(70));

    const prompt = buildSystemPrompt(cat, cat.memory_summary);
    const checks = checkPrompt(prompt, cat);

    console.log('\n✅ Prompt 檢查結果：');
    Object.entries(checks).forEach(([key, passed]) => {
      const icon = passed ? '✅' : '❌';
      console.log(`   ${icon} ${key}: ${passed ? '通過' : '失敗'}`);
      totalChecks++;
      if (passed) passCount++;
    });

    // 顯示 prompt 片段（前 500 字）
    console.log('\n📝 Prompt 預覽（前 500 字）：');
    console.log(prompt.substring(0, 500) + '...\n');
  }

  console.log('='.repeat(70));
  console.log(`\n📊 測試結果：${passCount}/${totalChecks} 項檢查通過\n`);

  // 測試錯誤訊息
  console.log('🔍 錯誤處理測試：');
  const livingCat = TEST_CATS[0];
  const angelCat = TEST_CATS[1];
  
  console.log(`   Living 狀態錯誤訊息應包含：「${livingCat.self_ref}現在午睡中」`);
  console.log(`   Angel 狀態錯誤訊息應包含：「${angelCat.self_ref}去雲端抓蝴蝶了」`);
  console.log('   （此部分需在實際 API 錯誤時測試）\n');
}

main().catch((err) => {
  console.error('❌ 測試失敗:', err);
  process.exit(1);
});
