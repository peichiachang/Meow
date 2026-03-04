/**
 * SDD v2.1 - 更新 daily_context
 * 每天更新一次天氣資訊，用於注入 AI 對話情境
 * 
 * 呼叫方式：
 * - 前端：在開啟 App 時呼叫（選填，需要位置授權）
 * - 後端：可設定 cron job 每日自動更新
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { weatherCodeToMood, getTodayTaiwanDate } from '../_shared/stateCalculator.ts';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

Deno.serve(async (req) => {
  const requestOrigin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 認證
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

    // 解析請求體（選填：位置資訊）
    let body: { lat?: number; lng?: number } = {};
    try {
      if (req.method === 'POST') {
        body = await req.json();
      }
    } catch {
      // 忽略 JSON 解析錯誤，使用預設值
    }

    const lat = body.lat;
    const lng = body.lng;

    // 如果沒有提供位置，查詢是否有儲存的位置
    let finalLat = lat;
    let finalLng = lng;

    if (!finalLat || !finalLng) {
      // 查詢使用者最近一次的位置記錄
      const { data: recentContext } = await supabase
        .from('daily_context')
        .select('location_lat, location_lng')
        .eq('user_id', user.id)
        .not('location_lat', 'is', null)
        .not('location_lng', 'is', null)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentContext?.location_lat && recentContext?.location_lng) {
        finalLat = recentContext.location_lat;
        finalLng = recentContext.location_lng;
      } else {
        // 預設使用台北座標
        finalLat = 25.0330;
        finalLng = 121.5654;
      }
    }

    // 檢查今天是否已經更新過（使用 fetched_date 欄位）
    const now = new Date();
    const taiwanOffset = 8 * 60; // UTC+8
    const taiwanTime = new Date(now.getTime() + (taiwanOffset - now.getTimezoneOffset()) * 60000);
    const todayDate = taiwanTime.toISOString().split('T')[0]; // YYYY-MM-DD 格式

    const { data: existingContext } = await supabase
      .from('daily_context')
      .select('id, weather_code')
      .eq('user_id', user.id)
      .eq('fetched_date', todayDate)
      .maybeSingle();

    // 如果今天已經更新過，直接返回
    if (existingContext) {
      return new Response(
        JSON.stringify({
          ok: true,
          message: 'Already updated today',
          weather_code: existingContext.weather_code,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 取得天氣資訊
    let weatherCode: number | null = null;
    try {
      const url = `${OPEN_METEO_BASE}?latitude=${finalLat}&longitude=${finalLng}&current=weather_code`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as { current?: { weather_code?: number } };
        weatherCode = data.current?.weather_code ?? null;
      }
    } catch (err) {
      console.error('[update-daily-context] Weather API error:', err);
      // 繼續執行，weather_code 為 null
    }

    // 轉換天氣代碼為 mood
    const weatherMood = weatherCode ? weatherCodeToMood(weatherCode) : null;

    // 儲存或更新 daily_context
    // 使用 upsert，觸發器會自動更新 fetched_date
    const { data: contextData, error: contextError } = await supabase
      .from('daily_context')
      .upsert({
        user_id: user.id,
        weather_code: weatherCode,
        weather_mood: weatherMood,
        location_lat: finalLat,
        location_lng: finalLng,
        fetched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // fetched_date 會由觸發器自動設定
      }, {
        onConflict: 'user_id,fetched_date',
      })
      .select()
      .single();

    if (contextError) {
      console.error('[update-daily-context] Database error:', contextError);
      return new Response(
        JSON.stringify({ error: 'Failed to save context' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (contextError) {
      console.error('[update-daily-context] Database error:', contextError);
      return new Response(
        JSON.stringify({ error: 'Failed to save context' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        weather_code: weatherCode,
        weather_mood: weatherMood,
        location: { lat: finalLat, lng: finalLng },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[update-daily-context] Error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
