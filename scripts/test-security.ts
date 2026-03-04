/**
 * 安全性測試腳本
 * 測試 Edge Function 的認證檢查和 CORS 設定
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

const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/chat`;

async function testWithoutAuth() {
  console.log('\n📋 測試 1: 未提供認證 token（應該失敗）');
  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        message: '測試訊息',
        cat: {
          cat_name: '測試貓',
          age: 3,
          personality: [],
          self_ref: '我',
          status: 'Living',
        },
      }),
    });

    const text = await res.text();
    if (res.status === 401) {
      console.log('✅ 通過：未認證的請求被正確拒絕');
      console.log(`   回應：${text.substring(0, 100)}`);
    } else {
      console.log('❌ 失敗：未認證的請求應該返回 401');
      console.log(`   狀態碼：${res.status}`);
      console.log(`   回應：${text}`);
    }
  } catch (error) {
    console.log('❌ 錯誤：', error);
  }
}

async function testWithInvalidAuth() {
  console.log('\n📋 測試 2: 提供無效的認證 token（應該失敗）');
  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid_token_12345',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        message: '測試訊息',
        cat: {
          cat_name: '測試貓',
          age: 3,
          personality: [],
          self_ref: '我',
          status: 'Living',
        },
      }),
    });

    const text = await res.text();
    if (res.status === 401) {
      console.log('✅ 通過：無效 token 被正確拒絕');
      console.log(`   回應：${text.substring(0, 100)}`);
    } else {
      console.log('❌ 失敗：無效 token 應該返回 401');
      console.log(`   狀態碼：${res.status}`);
      console.log(`   回應：${text}`);
    }
  } catch (error) {
    console.log('❌ 錯誤：', error);
  }
}

async function testWithValidAuth() {
  console.log('\n📋 測試 3: 提供有效的認證 token（應該成功）');
  
  // 建立 Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 嘗試取得 session（需要先登入）
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    console.log('⚠️  警告：無法取得有效的 session');
    console.log('   請先在前端登入，然後再執行此測試');
    console.log('   或使用以下方式取得測試 token：');
    console.log('   1. 在前端登入後，開啟瀏覽器開發者工具');
    console.log('   2. Console 執行：localStorage.getItem("sb-xxx-auth-token")');
    console.log('   3. 或使用 Supabase Dashboard 建立測試使用者');
    return;
  }

  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        message: '測試訊息',
        cat: {
          cat_name: '測試貓',
          age: 3,
          personality: [],
          self_ref: '我',
          status: 'Living',
        },
      }),
    });

    const text = await res.text();
    if (res.ok) {
      const json = JSON.parse(text);
      console.log('✅ 通過：有效的認證請求成功');
      console.log(`   回應：${json.reply?.substring(0, 100) || text.substring(0, 100)}`);
    } else {
      console.log('❌ 失敗：有效的認證請求應該成功');
      console.log(`   狀態碼：${res.status}`);
      console.log(`   回應：${text}`);
    }
  } catch (error) {
    console.log('❌ 錯誤：', error);
  }
}

async function testCorsHeaders() {
  console.log('\n📋 測試 4: CORS Headers（檢查回應標頭）');
  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://test-domain.com',
        apikey: SUPABASE_ANON_KEY,
      },
    });

    const corsOrigin = res.headers.get('Access-Control-Allow-Origin');
    const corsMethods = res.headers.get('Access-Control-Allow-Methods');
    const corsHeaders = res.headers.get('Access-Control-Allow-Headers');

    console.log('   CORS Headers:');
    console.log(`   - Access-Control-Allow-Origin: ${corsOrigin || '(未設定)'}`);
    console.log(`   - Access-Control-Allow-Methods: ${corsMethods || '(未設定)'}`);
    console.log(`   - Access-Control-Allow-Headers: ${corsHeaders || '(未設定)'}`);

    if (corsOrigin && corsOrigin !== '*') {
      console.log('✅ 通過：CORS 已限制為特定域名');
    } else if (corsOrigin === '*') {
      console.log('⚠️  警告：CORS 允許所有來源（生產環境建議限制）');
    } else {
      console.log('❌ 失敗：CORS headers 未設定');
    }
  } catch (error) {
    console.log('❌ 錯誤：', error);
  }
}

async function main() {
  console.log('🔒 Edge Function 安全性測試');
  console.log('='.repeat(50));
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Edge Function URL: ${EDGE_FUNCTION_URL}`);

  await testWithoutAuth();
  await testWithInvalidAuth();
  await testCorsHeaders();
  await testWithValidAuth();

  console.log('\n' + '='.repeat(50));
  console.log('✅ 測試完成');
  console.log('\n💡 提示：');
  console.log('   - 如果測試 3 失敗，請先在前端登入取得有效的 session');
  console.log('   - 檢查 Supabase Dashboard → Edge Functions → Secrets 確認 ALLOWED_ORIGINS 已設定');
}

main().catch(console.error);
