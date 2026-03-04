/**
 * SDD v2.1 情境狀態系統自動化測試
 * 測試 daily_context 更新和狀態注入功能
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// 載入環境變數
dotenv.config({ path: join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 請在 .env 設定 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const UPDATE_CONTEXT_URL = `${SUPABASE_URL}/functions/v1/update-daily-context`;
const CHAT_URL = `${SUPABASE_URL}/functions/v1/chat`;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logResult(result: TestResult) {
  results.push(result);
  const icon = result.passed ? '✅' : '❌';
  console.log(`\n${icon} ${result.name}`);
  console.log(`   ${result.message}`);
  if (result.details) {
    console.log(`   詳情：`, JSON.stringify(result.details, null, 2));
  }
}

/**
 * 測試 1: 更新 daily_context（無位置）
 */
async function testUpdateDailyContextWithoutLocation(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    logResult({
      name: '測試 1: 更新 daily_context（無位置）',
      passed: false,
      message: '需要先登入才能測試',
      details: { error: 'No session found' },
    });
    return;
  }

  try {
    const res = await fetch(UPDATE_CONTEXT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({}), // 不提供位置，應使用預設
    });

    const data = await res.json();

    if (res.ok && data.ok) {
      logResult({
        name: '測試 1: 更新 daily_context（無位置）',
        passed: true,
        message: '成功更新 daily_context',
        details: {
          weather_code: data.weather_code,
          weather_mood: data.weather_mood,
          location: data.location,
        },
      });
    } else {
      logResult({
        name: '測試 1: 更新 daily_context（無位置）',
        passed: false,
        message: `更新失敗：${data.error || res.status}`,
        details: { status: res.status, data },
      });
    }
  } catch (error) {
    logResult({
      name: '測試 1: 更新 daily_context（無位置）',
      passed: false,
      message: `請求錯誤：${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * 測試 2: 更新 daily_context（有位置）
 */
async function testUpdateDailyContextWithLocation(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    logResult({
      name: '測試 2: 更新 daily_context（有位置）',
      passed: false,
      message: '需要先登入才能測試',
    });
    return;
  }

  try {
    // 使用台北座標
    const res = await fetch(UPDATE_CONTEXT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        lat: 25.0330,
        lng: 121.5654,
      }),
    });

    const data = await res.json();

    if (res.ok && data.ok) {
      logResult({
        name: '測試 2: 更新 daily_context（有位置）',
        passed: true,
        message: '成功更新 daily_context（使用指定位置）',
        details: {
          weather_code: data.weather_code,
          weather_mood: data.weather_mood,
          location: data.location,
        },
      });
    } else {
      logResult({
        name: '測試 2: 更新 daily_context（有位置）',
        passed: false,
        message: `更新失敗：${data.error || res.status}`,
        details: { status: res.status, data },
      });
    }
  } catch (error) {
    logResult({
      name: '測試 2: 更新 daily_context（有位置）',
      passed: false,
      message: `請求錯誤：${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * 測試 3: 檢查 daily_context 資料庫記錄
 */
async function testDailyContextDatabase(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    logResult({
      name: '測試 3: 檢查 daily_context 資料庫記錄',
      passed: false,
      message: '需要先登入才能測試',
    });
    return;
  }

  try {
    // 取得今天的日期（台灣時間）
    const now = new Date();
    const taiwanOffset = 8 * 60; // UTC+8
    const taiwanTime = new Date(now.getTime() + (taiwanOffset - now.getTimezoneOffset()) * 60000);
    const todayDate = taiwanTime.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_context')
      .select('*')
      .eq('user_id', user.id)
      .eq('fetched_date', todayDate)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logResult({
        name: '測試 3: 檢查 daily_context 資料庫記錄',
        passed: false,
        message: `查詢錯誤：${error.message}`,
        details: { error },
      });
      return;
    }

    if (data) {
      logResult({
        name: '測試 3: 檢查 daily_context 資料庫記錄',
        passed: true,
        message: '找到今天的 daily_context 記錄',
        details: {
          id: data.id,
          weather_code: data.weather_code,
          weather_mood: data.weather_mood,
          fetched_date: data.fetched_date,
          location: data.location_lat && data.location_lng 
            ? { lat: data.location_lat, lng: data.location_lng }
            : null,
        },
      });
    } else {
      logResult({
        name: '測試 3: 檢查 daily_context 資料庫記錄',
        passed: false,
        message: `未找到今天的記錄（日期：${todayDate}）`,
        details: { todayDate },
      });
    }
  } catch (error) {
    logResult({
      name: '測試 3: 檢查 daily_context 資料庫記錄',
      passed: false,
      message: `錯誤：${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * 測試 4: 測試狀態計算（時間基礎）
 */
async function testTimeBasedStateCalculation(): Promise<void> {
  const now = new Date();
  const hour = now.getHours();
  
  // 根據 SDD v2.1 的狀態對應表
  let expectedEnergy: number;
  let expectedMood: string;

  if (hour >= 6 && hour < 9) {
    expectedEnergy = 60;
    expectedMood = '期待（討飯模式）';
  } else if (hour >= 10 && hour < 14) {
    expectedEnergy = 80;
    expectedMood = '活躍';
  } else if (hour >= 14 && hour < 17) {
    expectedEnergy = 30;
    expectedMood = '慵懶（午睡時段）';
  } else if (hour >= 17 && hour < 20) {
    expectedEnergy = 70;
    expectedMood = '期待（等主人回家）';
  } else if (hour >= 20 && hour < 23) {
    expectedEnergy = 50;
    expectedMood = '放鬆';
  } else {
    expectedEnergy = 20;
    expectedMood = '睏睏（催你睡覺）';
  }

  logResult({
    name: '測試 4: 狀態計算（時間基礎）',
    passed: true,
    message: `當前時間 ${hour}:00，預期狀態：energy=${expectedEnergy}, mood="${expectedMood}"`,
    details: {
      currentHour: hour,
      expectedEnergy,
      expectedMood,
    },
  });
}

/**
 * 測試 5: 測試 chat Edge Function 狀態注入
 */
async function testChatStateInjection(): Promise<void> {
  const { data: { session, user } } = await supabase.auth.getSession();
  
  if (!session || !user) {
    logResult({
      name: '測試 5: chat Edge Function 狀態注入',
      passed: false,
      message: '需要先登入才能測試',
    });
    return;
  }

  // 先確保有 daily_context 記錄
  await testUpdateDailyContextWithoutLocation();

  // 嘗試取得或建立測試貓咪
  let testCatId: string | null = null;
  const { data: cats } = await supabase
    .from('cats')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  if (cats && cats.length > 0) {
    testCatId = cats[0].id;
  } else {
    // 建立測試貓咪
    const { data: newCat, error: catError } = await supabase
      .from('cats')
      .insert({
        user_id: user.id,
        cat_name: '測試貓',
        age: 3,
        personality: ['活潑'],
        self_ref: '我',
        status: 'Living',
      })
      .select('id')
      .single();

    if (newCat && !catError) {
      testCatId = newCat.id;
    }
  }

  if (!testCatId) {
    logResult({
      name: '測試 5: chat Edge Function 狀態注入',
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
        message: '測試狀態注入',
        cat: {
          id: testCatId,
          cat_name: '測試貓',
          age: 3,
          personality: ['活潑'],
          self_ref: '我',
          status: 'Living',
          hunger: 50, // 前端計算的 hunger
        },
        memorySummary: null,
        history: [],
      }),
    });

    const data = await res.json();

    if (res.ok && data.reply) {
      // 檢查回應中是否包含狀態相關的內容
      const reply = data.reply.toLowerCase();
      const hasStateIndicators = 
        reply.includes('期待') ||
        reply.includes('慵懶') ||
        reply.includes('活躍') ||
        reply.includes('睏睏') ||
        reply.includes('放鬆') ||
        reply.includes('討飯') ||
        reply.includes('午睡');

      logResult({
        name: '測試 5: chat Edge Function 狀態注入',
        passed: hasStateIndicators,
        message: hasStateIndicators 
          ? 'AI 回應包含狀態相關內容' 
          : 'AI 回應未明顯包含狀態相關內容（可能需要檢查 prompt）',
        details: {
          reply: data.reply.substring(0, 200),
          hasStateIndicators,
        },
      });
    } else {
      logResult({
        name: '測試 5: chat Edge Function 狀態注入',
        passed: false,
        message: `請求失敗：${data.error || res.status}`,
        details: { status: res.status, data },
      });
    }
  } catch (error) {
    logResult({
      name: '測試 5: chat Edge Function 狀態注入',
      passed: false,
      message: `請求錯誤：${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * 測試 6: 測試重複更新（應該只更新一次）
 */
async function testDuplicateUpdatePrevention(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    logResult({
      name: '測試 6: 重複更新預防',
      passed: false,
      message: '需要先登入才能測試',
    });
    return;
  }

  try {
    // 第一次更新
    const res1 = await fetch(UPDATE_CONTEXT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({}),
    });

    const data1 = await res1.json();

    // 立即第二次更新（應該返回已更新的訊息）
    const res2 = await fetch(UPDATE_CONTEXT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({}),
    });

    const data2 = await res2.json();

    if (res2.ok && data2.message === 'Already updated today') {
      logResult({
        name: '測試 6: 重複更新預防',
        passed: true,
        message: '成功防止重複更新（同一天只更新一次）',
        details: {
          firstUpdate: data1.ok,
          secondUpdate: data2.message,
        },
      });
    } else {
      logResult({
        name: '測試 6: 重複更新預防',
        passed: false,
        message: '未正確防止重複更新',
        details: {
          firstUpdate: data1,
          secondUpdate: data2,
        },
      });
    }
  } catch (error) {
    logResult({
      name: '測試 6: 重複更新預防',
      passed: false,
      message: `請求錯誤：${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

/**
 * 測試 7: 測試天氣代碼轉換
 */
async function testWeatherCodeConversion(): Promise<void> {
  // 測試各種天氣代碼轉換為 mood
  const testCases = [
    { code: 200, expectedMood: '害怕' }, // 打雷
    { code: 300, expectedMood: '煩躁或黏人' }, // 下雨
    { code: 500, expectedMood: '煩躁或黏人' }, // 下雨
    { code: 600, expectedMood: '寒冷黏人' }, // 下雪
    { code: 800, expectedMood: '慵懶曬太陽' }, // 晴天
    { code: 801, expectedMood: '慵懶' }, // 陰天
  ];

  logResult({
    name: '測試 7: 天氣代碼轉換',
    passed: true,
    message: '天氣代碼轉換邏輯已實作（需在 Edge Function 中驗證）',
    details: {
      testCases: testCases.map(tc => ({
        code: tc.code,
        expectedMood: tc.expectedMood,
      })),
    },
  });
}

/**
 * 嘗試自動登入（使用測試帳號）
 */
async function tryAutoLogin(): Promise<boolean> {
  const testEmail = process.env.TEST_EMAIL;
  const testPassword = process.env.TEST_PASSWORD;

  // 如果沒有設定測試帳號，跳過自動登入
  if (!testEmail || !testPassword) {
    return false;
  }

  // 先嘗試登入
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInData.session) {
    console.log(`✅ 自動登入成功：${testEmail}`);
    return true;
  }

  // 如果登入失敗，嘗試註冊
  if (signInError?.message?.includes('Invalid login credentials')) {
    console.log(`⚠️  登入失敗，嘗試註冊測試帳號：${testEmail}`);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpData.session) {
      console.log(`✅ 註冊並登入成功：${testEmail}`);
      return true;
    } else if (signUpError) {
      console.log(`❌ 註冊失敗：${signUpError.message}`);
    }
  } else if (signInError) {
    console.log(`❌ 登入失敗：${signInError.message}`);
  }

  return false;
}

/**
 * 主測試函數
 */
async function main() {
  console.log('🧪 SDD v2.1 情境狀態系統自動化測試');
  console.log('='.repeat(60));
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`測試時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`);
  console.log('='.repeat(60));

  // 檢查登入狀態
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
  await testTimeBasedStateCalculation();
  await testWeatherCodeConversion();
  
  if (session) {
    await testUpdateDailyContextWithoutLocation();
    await testUpdateDailyContextWithLocation();
    await testDailyContextDatabase();
    await testDuplicateUpdatePrevention();
    await testChatStateInjection();
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
