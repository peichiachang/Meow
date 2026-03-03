/**
 * 開場白天氣（選填）
 * SDD 4.5：開場白可含天氣連結，需位置權限；使用者未授權則不請求、不影響開場白。
 */

export type WeatherCondition = 'sunny' | 'cloudy' | 'rain' | 'thunder' | 'snow';

export type WeatherResult = {
  condition: WeatherCondition;
} | null;

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const GEOLOCATION_TIMEOUT_MS = 3000;
const FETCH_TIMEOUT_MS = 5000;

function getPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      reject,
      { timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 1000 * 60 * 30 }
    );
  });
}

/** WMO weather_code → 簡化條件 */
function codeToCondition(code: number): WeatherCondition {
  if (code >= 95 && code <= 99) return 'thunder';
  if (code >= 71 && code <= 77) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code >= 1 && code <= 3) return 'cloudy';
  return 'sunny';
}

/**
 * 取得目前天氣（需使用者已授權位置）。
 * 失敗或未授權時回傳 null，不拋錯。
 */
export async function getCurrentWeather(): Promise<WeatherResult> {
  let lat: number;
  let lon: number;
  try {
    const pos = await getPosition();
    lat = pos.lat;
    lon = pos.lon;
  } catch {
    return null;
  }

  const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}&current=weather_code`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = (await res.json()) as { current?: { weather_code?: number } };
    const code = data.current?.weather_code;
    if (code == null) return null;
    return { condition: codeToCondition(code) };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
