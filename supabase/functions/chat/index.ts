// Meow - 對話代理（開發測試使用 Gemini 2.5 Flash-Lite 免費版）
// 透過 Supabase Edge Function 呼叫 Google Gemini API，避免在前端暴露 API Key
// systemPrompt 在伺服器組裝，避免用戶端快取舊 JS 導致摸肚子／肚子餓等邏輯錯誤

import { buildSystemPrompt, getPreferenceTriggerInstruction } from './promptBuilder.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  calculateTimeBasedState,
  weatherCodeToMood,
  mergeMood,
  getTodayTaiwanDate,
} from '../_shared/stateCalculator.ts';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';

/**
 * 取得當天該貓咪的對話輪數（user 訊息數）
 * 用於判斷是否需要在第 1-5 輪附加 [Trigger: Affection]
 */
async function getConversationTurn(
  supabase: any,
  catId: string
): Promise<number> {
  // 取得台灣時間今天的開始時間（00:00:00）
  const now = new Date();
  const taiwanOffset = 8 * 60; // UTC+8
  const taiwanTime = new Date(now.getTime() + (taiwanOffset - now.getTimezoneOffset()) * 60000);
  const todayStart = new Date(taiwanTime);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartISO = todayStart.toISOString();

  // 計算當天該貓咪的 user 訊息數
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('cat_id', catId)
    .eq('role', 'user')
    .gte('created_at', todayStartISO);

  if (error) {
    console.error('[getConversationTurn] Error:', error);
    return 0;
  }

  return count ?? 0;
}

Deno.serve(async (req) => {
  const requestOrigin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🔒 安全性：驗證使用者已登入
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🔒 後端訊息限制檢查（防止繞過前端檢查）
    const dailyLimitRaw = Deno.env.get('DAILY_MESSAGE_LIMIT');
    const dailyLimit = dailyLimitRaw ? parseInt(dailyLimitRaw, 10) : 20; // 預設 20
    const exemptUserIdsRaw = Deno.env.get('EXEMPT_USER_IDS');
    const exemptUserIds = exemptUserIdsRaw
      ? exemptUserIdsRaw.split(',').map((id) => id.trim()).filter((id) => id.length > 0)
      : [];
    const isExempt = exemptUserIds.includes(user.id);

    // 只有在有限制且不是例外帳號時才檢查
    if (dailyLimit > 0 && !isExempt) {
      // 取得台灣時間今天的日期（YYYY-MM-DD）
      const now = new Date();
      const taiwanOffset = 8 * 60; // UTC+8
      const taiwanTime = new Date(now.getTime() + (taiwanOffset - now.getTimezoneOffset()) * 60000);
      const todayDate = taiwanTime.toISOString().split('T')[0]; // YYYY-MM-DD 格式

      // 查詢今天的訊息數量
      const { data: dailyCount, error: countError } = await supabase
        .from('daily_message_counts')
        .select('count')
        .eq('user_id', user.id)
        .eq('date', todayDate)
        .maybeSingle();

      if (countError && countError.code !== 'PGRST116') {
        console.error('[chat] Error checking daily message count:', countError);
        // 查詢錯誤時不阻擋，但記錄錯誤
      } else {
        const currentCount = dailyCount?.count ?? 0;
        if (currentCount >= dailyLimit) {
          return new Response(
            JSON.stringify({
              error: '今日訊息已達上限',
              detail: `每日限制 ${dailyLimit} 則訊息，請明天再試或升級方案`,
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // 可選：若有設定 shared secret，才要求請求帶 x-meow-secret
    // 目的：避免公開端點被濫用（不設定則不影響現有前端）
    const sharedSecret = Deno.env.get('MEOW_CHAT_SHARED_SECRET');
    if (sharedSecret) {
      const provided = req.headers.get('x-meow-secret');
      if (!provided || provided !== sharedSecret) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 解析請求體，設置超時避免長時間等待
    let body: any;
    try {
      body = await req.json();
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    let { message, cat, memorySummary, history } = body;

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SDD v3.6: 根據對話輪數決定是否附加 [Trigger: Affection]
    if (cat && typeof cat === 'object' && cat.cat_name && cat.id) {
      const turn = await getConversationTurn(supabase, cat.id);
      if (turn <= 5) {
        message = message + '\n[Trigger: Affection]';
      }
    }

    // SDD v2.1: 讀取 daily_context 並計算狀態（mood/energy/hunger）
    let calculatedMood: string | null = null;
    let calculatedEnergy: number | null = null;
    if (user) {
      // 查詢今天的 daily_context（使用 fetched_date 欄位）
      const now = new Date();
      const taiwanOffset = 8 * 60; // UTC+8
      const taiwanTime = new Date(now.getTime() + (taiwanOffset - now.getTimezoneOffset()) * 60000);
      const todayDate = taiwanTime.toISOString().split('T')[0]; // YYYY-MM-DD 格式
      
      const { data: dailyContext } = await supabase
        .from('daily_context')
        .select('weather_code, weather_mood')
        .eq('user_id', user.id)
        .eq('fetched_date', todayDate)
        .maybeSingle();

      // 計算時間基礎狀態
      const timeState = calculateTimeBasedState();
      
      // 合併天氣 mood（如果有的話）
      const weatherMood = dailyContext?.weather_code
        ? weatherCodeToMood(dailyContext.weather_code)
        : null;
      calculatedMood = mergeMood(timeState.mood, weatherMood);
      calculatedEnergy = timeState.energy;

      // 如果前端有傳遞 mood/energy/hunger，優先使用（允許覆蓋）
      if (cat && typeof cat === 'object') {
        if (cat.mood) calculatedMood = cat.mood;
        if (cat.energy != null) calculatedEnergy = cat.energy;
      }
    }

    // 在伺服器組裝 systemPrompt，不依賴前端版本，避免快取導致摸肚子／肚子餓等邏輯錯誤
    let systemPrompt: string;
    if (cat && typeof cat === 'object' && cat.cat_name) {
      // 注入計算好的狀態
      const catWithState = {
        ...cat,
        mood: calculatedMood,
        energy: calculatedEnergy,
        // hunger 由前端計算並傳遞
      };
      const basePrompt = buildSystemPrompt(catWithState, memorySummary ?? null);
      // 從 message 中移除 [Trigger: Affection] 標記後再傳給 getPreferenceTriggerInstruction
      const messageForPreference = message.replace(/\n\[Trigger: Affection\]$/, '');
      const preferenceInstruction = getPreferenceTriggerInstruction(messageForPreference, cat);
      const turnInstruction = `\n【本輪】使用者剛說：「${messageForPreference}」。你的回覆必須僅針對這句話，且不可與你上一則回覆相同或複製同一句型。`;
      systemPrompt = basePrompt + (preferenceInstruction || '') + turnInstruction;
    } else if (typeof body.systemPrompt === 'string') {
      systemPrompt = body.systemPrompt;
    } else {
      return new Response(
        JSON.stringify({ error: 'cat or systemPrompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contents: { role: string; parts: { text: string }[] }[] = [];
    // 限制歷史訊息數量：最多 5 條（避免超時和 token 過多）
    const limitedHistory = Array.isArray(history) ? history.slice(-5) : [];
    for (const m of limitedHistory) {
      const role = m.role === 'assistant' ? 'model' : 'user';
      contents.push({ role, parts: [{ text: (m.content || '').slice(0, 500) }] }); // 限制單條訊息長度為 500 字
    }
    contents.push({ role: 'user', parts: [{ text: message.slice(0, 500) }] }); // 限制當前訊息長度

    const geminiBody = {
      systemInstruction: systemPrompt
        ? { role: 'system', parts: [{ text: systemPrompt }] }
        : undefined,
      contents,
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.9,
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    
    // 設置超時：Supabase Edge Functions 預設 60 秒，我們設置 50 秒以避免超時
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000); // 50 秒超時
    
    let geminiRes: Response;
    try {
      geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('[chat] Request timeout after 50s');
        const selfRef = cat?.self_ref || '我';
        const status = cat?.status || 'Living';
        const errorMessage = status === 'Angel'
          ? `${selfRef}去雲端抓蝴蝶了，等等再回來陪你喵... (連線超時)`
          : `${selfRef}現在午睡中，暫時不想理你喵... (連線超時)`;
        return new Response(
          JSON.stringify({ error: errorMessage }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw err;
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[chat] Gemini error:', geminiRes.status, errText);
      // SDD v3.2：API 異常時根據狀態顯示不同訊息
      const selfRef = cat?.self_ref || '我';
      const status = cat?.status || 'Living';
      const errorMessage = geminiRes.status === 502 || geminiRes.status === 503
        ? status === 'Angel'
          ? `${selfRef}去雲端抓蝴蝶了，等等再回來陪你喵... (連線異常)`
          : `${selfRef}現在午睡中，暫時不想理你喵... (連線異常)`
        : 'AI service error';
      return new Response(
        JSON.stringify({ error: errorMessage, detail: errText }),
        { status: geminiRes.status >= 500 ? 502 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await geminiRes.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

    if (!text) {
      console.error('[chat] Empty response from Gemini:', JSON.stringify(data));
      const selfRef = cat?.self_ref || '我';
      const status = cat?.status || 'Living';
      const errorMessage = status === 'Angel'
        ? `${selfRef}去雲端抓蝴蝶了，等等再回來陪你喵... (回應異常)`
        : `${selfRef}現在午睡中，暫時不想理你喵... (回應異常)`;
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🔒 成功處理訊息後，遞增每日訊息計數（原子操作）
    if (dailyLimit > 0 && !isExempt) {
      const now = new Date();
      const taiwanOffset = 8 * 60; // UTC+8
      const taiwanTime = new Date(now.getTime() + (taiwanOffset - now.getTimezoneOffset()) * 60000);
      const todayDate = taiwanTime.toISOString().split('T')[0]; // YYYY-MM-DD 格式

      const { error: incrementError } = await supabase.rpc(
        'increment_daily_message_count',
        { p_user_id: user.id, p_date: todayDate }
      );

      if (incrementError) {
        console.error('[chat] Error incrementing daily message count:', incrementError);
        // 遞增失敗不影響回應，但記錄錯誤
      }
    }

    return new Response(
      JSON.stringify({ reply: text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[chat] Error:', err);
    const errorMessage = err instanceof Error && err.name === 'AbortError'
      ? 'Request timeout'
      : String(err);
    const selfRef = cat?.self_ref || '我';
    const status = cat?.status || 'Living';
    const userFriendlyMessage = errorMessage.includes('timeout') || errorMessage.includes('AbortError')
      ? status === 'Angel'
        ? `${selfRef}去雲端抓蝴蝶了，等等再回來陪你喵... (連線超時)`
        : `${selfRef}現在午睡中，暫時不想理你喵... (連線超時)`
      : 'AI service error';
    return new Response(
      JSON.stringify({ error: userFriendlyMessage }),
      { status: err instanceof Error && err.name === 'AbortError' ? 504 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
