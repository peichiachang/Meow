// Meow SDD 2.5 - 記憶摘要生成（開發測試使用 Gemini 2.5 Flash-Lite）
// 每 10 則對話後非同步呼叫，將歷史對話壓縮成摘要

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const MESSAGES_PER_BATCH = 20; // 每 10 則對話（20 則訊息）觸發一次
const GEMINI_MODEL = 'gemini-2.5-flash-lite';

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

    const { data: { user } } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { catId } = await req.json();
    if (!catId || typeof catId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'catId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 確認使用者擁有該貓咪
    const { data: cat, error: catError } = await supabase
      .from('cats')
      .select('id, cat_name, memory_summary')
      .eq('id', catId)
      .eq('user_id', user.id)
      .single();

    if (catError || !cat) {
      return new Response(
        JSON.stringify({ error: 'Cat not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 取得該貓咪的訊息總數
    const { count: totalCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('cat_id', catId);

    if (!totalCount || totalCount % MESSAGES_PER_BATCH !== 0) {
      // 每 20 則訊息（10 則對話）才觸發
      return new Response(
        JSON.stringify({ ok: true, skipped: 'not at batch boundary' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 取得最近 20 則訊息（10 則對話）
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('cat_id', catId)
      .order('created_at', { ascending: false })
      .limit(20);

    const messages = (recentMessages || []).reverse();
    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, skipped: 'no messages' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const conversationText = messages
      .map((m) => `${m.role === 'user' ? '使用者' : '貓咪'}：${m.content}`)
      .join('\n');

    const systemPrompt = `你是一個對話摘要助手。請將以下貓咪「${cat.cat_name}」與使用者的對話，壓縮成簡短摘要（約 200–300 字）。

摘要應包含：
1. 使用者說過的重要事件（出差、生病、心情不好等）
2. 貓咪說過的承諾或特殊互動
3. 兩者之間建立的共同話題或梗

只輸出摘要內容，不要其他說明。`;

    const userPrompt = cat.memory_summary
      ? `既有摘要：\n${cat.memory_summary}\n\n---\n\n新對話：\n${conversationText}\n\n請將既有摘要與新對話合併，產出更新後的單一摘要。`
      : `對話內容：\n${conversationText}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.3 },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('[summarize-memory] Gemini error:', geminiRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'Summary generation failed', detail: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await geminiRes.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!summary) {
      return new Response(
        JSON.stringify({ error: 'Empty summary' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase
      .from('cats')
      .update({
        memory_summary: summary,
        memory_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', catId)
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({ ok: true, summaryLength: summary.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[summarize-memory] Error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
