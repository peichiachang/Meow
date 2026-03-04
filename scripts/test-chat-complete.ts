/**
 * SDD v2.1 完整對話流程測試
 * 測試 Edge Function 的完整流程（包含狀態注入、prompt 組裝、AI 回應）
 * 
 * 執行方式：
 *   npm run test:chat-complete
 * 
 * 需要：
 *   - 已登入（或設定 TEST_EMAIL 和 TEST_PASSWORD）
 *   - GEMINI_API_KEY 已設定在 Supabase Edge Function Secrets
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 請在 .env 設定 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const CHAT_URL = `${SUPABASE_URL}/functions/v1/chat`;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  reply?: string;
  checks?: Record<string, boolean>;
  details?: any;
}

const results: TestResult[] = [];

function logResult(result: TestResult) {
  results.push(result);
  const icon = result.passed ? '✅' : '❌';
  console.log(`\n${icon} ${result.name}`);
  console.log(`   ${result.message}`);
  if (result.reply) {
    console.log(`   回應：「${result.reply.substring(0, 150)}${result.reply.length > 150 ? '...' : ''}」`);
  }
  if (result.checks) {
    Object.entries(result.checks).forEach(([key, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${key}`);
    });
  }
  if (result.details) {
    console.log(`   詳情：`, JSON.stringify(result.details, null, 2));
  }
}

/**
 * SDD v2.1 檢查項目
 */
const SDD_CHECKS = {
  // 基本規範
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
  
  // SDD v2.1 語法框架
  hasSelfRef: (text: string, selfRef: string) => text.includes(selfRef),
  hasConnector: (text: string) => 
    text.includes('覺得') || text.includes('既然') || text.includes('所以'),
  hasActionBracket: (text: string) => /\([^)]{1,8}\)/.test(text),
  singleBracket: (text: string) => {
    const matches = text.match(/\([^)]+\)/g);
    return matches ? matches.length === 1 : false;
  },
  bracketAtEnd: (text: string) => {
    const trimmed = text.trim();
    return trimmed.endsWith(')') && /\([^)]{1,8}\)$/.test(trimmed);
  },
  noForbiddenWords: (text: string) => 
    !text.includes('哈氣') && !text.includes('嘶'),
  noMultipleBrackets: (text: string) => {
    const matches = text.match(/\([^)]+\)/g);
    return matches ? matches.length <= 1 : true;
  },
  
  // 狀態相關（如果有的話）
  hasStateIndicators: (text: string) => {
    const lower = text.toLowerCase();
    return lower.includes('期待') || lower.includes('慵懶') || 
           lower.includes('活躍') || lower.includes('睏睏') || 
           lower.includes('放鬆') || lower.includes('討飯') || 
           lower.includes('午睡');
  },
};

/**
 * 嘗試自動登入
 */
async function tryAutoLogin(): Promise<boolean> {
  const testEmail = process.env.TEST_EMAIL;
  const testPassword = process.env.TEST_PASSWORD;

  if (!testEmail || !testPassword) {
    return false;
  }

  const { data: signInData } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInData.session) {
    console.log(`✅ 自動登入成功：${testEmail}`);
    return true;
  }

  const { data: signUpData } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  if (signUpData.session) {
    console.log(`✅ 註冊並登入成功：${testEmail}`);
    return true;
  }

  return false;
}

/**
 * 取得或建立測試貓咪
 */
async function getOrCreateTestCat(userId: string): Promise<string | null> {
  const { data: cats } = await supabase
    .from('cats')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (cats && cats.length > 0) {
    return cats[0].id;
  }

  const { data: newCat, error } = await supabase
    .from('cats')
    .insert({
      user_id: userId,
      cat_name: '測試貓',
      age: 3,
      personality: ['活潑', '熱情'],
      self_ref: '我',
      status: 'Living',
    })
    .select('id')
    .single();

  if (newCat && !error) {
    return newCat.id;
  }

  return null;
}

/**
 * 測試一般對話回覆
 */
async function testGeneralChat(): Promise<void> {
  const { data: { session, user } } = await supabase.auth.getSession();
  
  if (!session || !user) {
    logResult({
      name: '測試 1: 一般對話回覆',
      passed: false,
      message: '需要先登入才能測試',
    });
    return;
  }

  const catId = await getOrCreateTestCat(user.id);
  if (!catId) {
    logResult({
      name: '測試 1: 一般對話回覆',
      passed: false,
      message: '無法取得或建立測試貓咪',
    });
    return;
  }

  try {
    const res = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        message: '你回來啦！',
        cat: {
          id: catId,
          cat_name: '測試貓',
          age: 3,
          personality: ['活潑', '熱情'],
          self_ref: '我',
          status: 'Living',
          hunger: 50,
        },
        memorySummary: null,
        history: [],
      }),
    });

    const data = await res.json();

    if (res.ok && data.reply) {
      const reply = data.reply;
      const checks = {
        no主人: SDD_CHECKS.no主人(reply),
        noAI: SDD_CHECKS.noAI(reply),
        sentenceCount: SDD_CHECKS.sentenceCount(reply),
        traditionalChinese: SDD_CHECKS.traditionalChinese(reply),
        hasSelfRef: SDD_CHECKS.hasSelfRef(reply, '我'),
        hasConnector: SDD_CHECKS.hasConnector(reply),
        hasActionBracket: SDD_CHECKS.hasActionBracket(reply),
        singleBracket: SDD_CHECKS.singleBracket(reply),
        bracketAtEnd: SDD_CHECKS.bracketAtEnd(reply),
        noForbiddenWords: SDD_CHECKS.noForbiddenWords(reply),
        noMultipleBrackets: SDD_CHECKS.noMultipleBrackets(reply),
      };

      const allPass = Object.values(checks).every(Boolean);

      logResult({
        name: '測試 1: 一般對話回覆',
        passed: allPass,
        message: allPass ? '通過所有 SDD v2.1 檢查' : '部分檢查未通過',
        reply,
        checks,
      });
    } else {
      logResult({
        name: '測試 1: 一般對話回覆',
        passed: false,
        message: `請求失敗：${data.error || res.status}`,
        details: { status: res.status, data },
      });
    }
  } catch (error) {
    logResult({
      name: '測試 1: 一般對話回覆',
      passed: false,
      message: `請求錯誤：${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * 測試不同個性的回覆
 */
async function testDifferentPersonalities(): Promise<void> {
  const { data: { session, user } } = await supabase.auth.getSession();
  
  if (!session || !user) {
    logResult({
      name: '測試 2: 不同個性回覆',
      passed: false,
      message: '需要先登入才能測試',
    });
    return;
  }

  const personalities = [
    { name: '傲嬌', selfRef: '本喵' },
    { name: '吃貨', selfRef: '我' },
    { name: '冷淡', selfRef: '我' },
  ];

  let passedCount = 0;
  const testResults: any[] = [];

  for (const personality of personalities) {
    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          message: '你好',
          cat: {
            id: 'test-cat',
            cat_name: '測試貓',
            age: 3,
            personality: [personality.name],
            self_ref: personality.selfRef,
            status: 'Living',
            hunger: 50,
          },
          memorySummary: null,
          history: [],
        }),
      });

      const data = await res.json();

      if (res.ok && data.reply) {
        const checks = {
          hasSelfRef: SDD_CHECKS.hasSelfRef(data.reply, personality.selfRef),
          hasConnector: SDD_CHECKS.hasConnector(data.reply),
          hasActionBracket: SDD_CHECKS.hasActionBracket(data.reply),
        };

        const passed = Object.values(checks).every(Boolean);
        if (passed) passedCount++;

        testResults.push({
          personality: personality.name,
          passed,
          reply: data.reply.substring(0, 100),
          checks,
        });
      }
    } catch (error) {
      testResults.push({
        personality: personality.name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // 避免 API 限流
    await new Promise((r) => setTimeout(r, 500));
  }

  const allPassed = passedCount === personalities.length;

  logResult({
    name: '測試 2: 不同個性回覆',
    passed: allPassed,
    message: `${passedCount}/${personalities.length} 個個性測試通過`,
    details: { testResults },
  });
}

/**
 * 測試狀態注入
 */
async function testStateInjection(): Promise<void> {
  const { data: { session, user } } = await supabase.auth.getSession();
  
  if (!session || !user) {
    logResult({
      name: '測試 3: 狀態注入',
      passed: false,
      message: '需要先登入才能測試',
    });
    return;
  }

  // 先更新 daily_context
  const UPDATE_CONTEXT_URL = `${SUPABASE_URL}/functions/v1/update-daily-context`;
  await fetch(UPDATE_CONTEXT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({}),
  });

  const catId = await getOrCreateTestCat(user.id);
  if (!catId) {
    logResult({
      name: '測試 3: 狀態注入',
      passed: false,
      message: '無法取得或建立測試貓咪',
    });
    return;
  }

  try {
    const res = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        message: '今天過得怎麼樣？',
        cat: {
          id: catId,
          cat_name: '測試貓',
          age: 3,
          personality: ['活潑'],
          self_ref: '我',
          status: 'Living',
          hunger: 70, // 高 hunger
        },
        memorySummary: null,
        history: [],
      }),
    });

    const data = await res.json();

    if (res.ok && data.reply) {
      const reply = data.reply.toLowerCase();
      const hasStateIndicators = SDD_CHECKS.hasStateIndicators(data.reply);
      const hasHungerMention = reply.includes('餓') || reply.includes('飯') || reply.includes('罐');

      logResult({
        name: '測試 3: 狀態注入',
        passed: hasStateIndicators || hasHungerMention,
        message: hasStateIndicators || hasHungerMention
          ? 'AI 回應包含狀態相關內容'
          : 'AI 回應未明顯包含狀態相關內容',
        reply: data.reply,
        checks: {
          hasStateIndicators,
          hasHungerMention,
        },
      });
    } else {
      logResult({
        name: '測試 3: 狀態注入',
        passed: false,
        message: `請求失敗：${data.error || res.status}`,
        details: { status: res.status, data },
      });
    }
  } catch (error) {
    logResult({
      name: '測試 3: 狀態注入',
      passed: false,
      message: `請求錯誤：${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * 測試撒嬌觸發（第 1-5 輪）
 */
async function testAffectionTrigger(): Promise<void> {
  const { data: { session, user } } = await supabase.auth.getSession();
  
  if (!session || !user) {
    logResult({
      name: '測試 4: 撒嬌觸發（第 1-5 輪）',
      passed: false,
      message: '需要先登入才能測試',
    });
    return;
  }

  const catId = await getOrCreateTestCat(user.id);
  if (!catId) {
    logResult({
      name: '測試 4: 撒嬌觸發（第 1-5 輪）',
      passed: false,
      message: '無法取得或建立測試貓咪',
    });
    return;
  }

  try {
    // 發送第一則訊息（應該觸發撒嬌）
    const res = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        message: '你好',
        cat: {
          id: catId,
          cat_name: '測試貓',
          age: 3,
          personality: ['熱情'],
          self_ref: '我',
          status: 'Living',
          hunger: 50,
        },
        memorySummary: null,
        history: [],
      }),
    });

    const data = await res.json();

    if (res.ok && data.reply) {
      const reply = data.reply.toLowerCase();
      const hasAffectionIndicators = 
        reply.includes('呼嚕') || reply.includes('蹭') || 
        reply.includes('踏踏') || reply.includes('翻肚') ||
        reply.includes('撒嬌') || reply.includes('喜歡');

      logResult({
        name: '測試 4: 撒嬌觸發（第 1-5 輪）',
        passed: hasAffectionIndicators,
        message: hasAffectionIndicators
          ? 'AI 回應包含撒嬌相關內容（可能觸發 [Trigger: Affection]）'
          : 'AI 回應未明顯包含撒嬌相關內容',
        reply: data.reply,
        checks: {
          hasAffectionIndicators,
        },
      });
    } else {
      logResult({
        name: '測試 4: 撒嬌觸發（第 1-5 輪）',
        passed: false,
        message: `請求失敗：${data.error || res.status}`,
        details: { status: res.status, data },
      });
    }
  } catch (error) {
    logResult({
      name: '測試 4: 撒嬌觸發（第 1-5 輪）',
      passed: false,
      message: `請求錯誤：${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * 主測試函數
 */
async function main() {
  console.log('🧪 SDD v2.1 完整對話流程測試');
  console.log('='.repeat(60));
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`測試時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`);
  console.log('='.repeat(60));

  // 嘗試自動登入
  let { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.log('\n⚠️  未登入，嘗試自動登入...');
    const loggedIn = await tryAutoLogin();
    if (loggedIn) {
      ({ data: { session } } = await supabase.auth.getSession());
    } else {
      console.log('\n⚠️  自動登入失敗，部分測試將跳過');
      console.log('   提示：可以設定環境變數來使用測試帳號：');
      console.log('   TEST_EMAIL=your-test@email.com');
      console.log('   TEST_PASSWORD=your-password');
      console.log('   或在前端登入後再執行測試\n');
    }
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    console.log(`✅ 已登入：${user?.email || 'Unknown'}\n`);
  }

  // 執行測試
  await testGeneralChat();
  
  if (session) {
    await testDifferentPersonalities();
    await testStateInjection();
    await testAffectionTrigger();
  } else {
    console.log('\n⏭️  跳過需要登入的測試');
  }

  // 輸出測試結果摘要
  console.log('\n' + '='.repeat(60));
  console.log('📊 測試結果摘要');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const failed = total - passed;

  console.log(`總測試數：${total}`);
  console.log(`✅ 通過：${passed}`);
  console.log(`❌ 失敗：${failed}`);

  if (failed > 0) {
    console.log('\n失敗的測試：');
    results
      .filter(r => !r.passed)
      .forEach(r => console.log(`   - ${r.name}: ${r.message}`));
  }

  console.log('\n' + '='.repeat(60));
  
  if (failed === 0) {
    console.log('🎉 所有測試通過！');
  } else {
    console.log('⚠️  部分測試失敗，請檢查上述錯誤訊息');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ 測試執行錯誤：', error);
  process.exit(1);
});
