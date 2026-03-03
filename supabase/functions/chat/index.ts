// Meow - 對話代理（開發測試使用 Gemini 2.5 Flash-Lite 免費版）
// 透過 Supabase Edge Function 呼叫 Google Gemini API，避免在前端暴露 API Key
// systemPrompt 在伺服器組裝，避免用戶端快取舊 JS 導致摸肚子／肚子餓等邏輯錯誤

import { buildSystemPrompt, getPreferenceTriggerInstruction } from './promptBuilder.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-meow-secret',
};

const GEMINI_MODEL = 'gemini-2.5-flash-lite';

Deno.serve(async (req) => {
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

    const body = await req.json();
    const { message, cat, memorySummary, history } = body;

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 在伺服器組裝 systemPrompt，不依賴前端版本，避免快取導致摸肚子／肚子餓等邏輯錯誤
    let systemPrompt: string;
    if (cat && typeof cat === 'object' && cat.cat_name) {
      const basePrompt = buildSystemPrompt(cat, memorySummary ?? null);
      const preferenceInstruction = getPreferenceTriggerInstruction(message, cat);
      const turnInstruction = `\n【本輪】使用者剛說：「${message}」。你的回覆必須僅針對這句話，且不可與你上一則回覆相同或複製同一句型。`;
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
    if (Array.isArray(history)) {
      for (const m of history) {
        const role = m.role === 'assistant' ? 'model' : 'user';
        contents.push({ role, parts: [{ text: m.content || '' }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

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
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[chat] Gemini error:', geminiRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'AI service error', detail: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await geminiRes.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

    return new Response(
      JSON.stringify({ reply: text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[chat] Error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
