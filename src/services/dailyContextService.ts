/**
 * SDD v2.1 - daily_context 更新服務
 * 在 App 開啟時呼叫，更新當天的天氣資訊
 */
import { supabase } from '../lib/supabase';

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-daily-context`
  : '';

/**
 * 更新 daily_context（選填，需要位置授權）
 * 如果使用者未授權位置，會使用上次儲存的位置或預設台北座標
 */
export async function updateDailyContext(): Promise<void> {
  if (!EDGE_FUNCTION_URL) {
    console.warn('[updateDailyContext] Edge Function URL not configured');
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.warn('[updateDailyContext] No session, skipping');
    return;
  }

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    console.warn('[updateDailyContext] Anon key not configured');
    return;
  }

  // 嘗試取得位置（選填）
  let lat: number | undefined;
  let lng: number | undefined;

  try {
    if (navigator?.geolocation) {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { timeout: 3000, maximumAge: 1000 * 60 * 30 } // 30 分鐘內的快取可用
        );
      });
      lat = position.coords.latitude;
      lng = position.coords.longitude;
    }
  } catch (err) {
    // 位置授權失敗或未授權，使用預設值（後端會處理）
    console.log('[updateDailyContext] Location not available, using default');
  }

  try {
    const body: { lat?: number; lng?: number } = {};
    if (lat && lng) {
      body.lat = lat;
      body.lng = lng;
    }

    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.text();
      console.warn('[updateDailyContext] Failed:', res.status, error);
      return;
    }

    const data = await res.json();
    console.log('[updateDailyContext] Success:', data);
  } catch (err) {
    console.error('[updateDailyContext] Error:', err);
    // 不拋錯，讓 App 繼續運作
  }
}
