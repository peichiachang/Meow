/**
 * SDD v2.1 情境狀態系統計算器（前端版本）
 * 計算 hunger 等需要前端資訊的狀態
 */

const LAST_OPEN_KEY = 'meow_last_open';

/**
 * 計算 hunger（SDD v2.1）
 * 距離上次開啟 App 越久，hunger 值越高
 */
export function calculateHunger(): number {
  const lastStr = localStorage.getItem(LAST_OPEN_KEY);
  if (!lastStr) {
    // 第一次開啟，設為 0
    localStorage.setItem(LAST_OPEN_KEY, Date.now().toString());
    return 0;
  }

  const last = parseInt(lastStr, 10);
  const hoursSinceLastOpen = (Date.now() - last) / (1000 * 60 * 60);
  
  // hunger 範圍：0-100
  // 每小時增加約 7，上限 100
  const hunger = Math.min(100, Math.floor(hoursSinceLastOpen * 7));
  return hunger;
}

/**
 * 更新最後開啟時間
 */
export function updateLastOpenTime(): void {
  localStorage.setItem(LAST_OPEN_KEY, Date.now().toString());
}
