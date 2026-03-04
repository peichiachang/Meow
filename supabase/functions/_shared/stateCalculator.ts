/**
 * SDD v2.1 情境狀態系統計算器
 * 計算 mood、energy、hunger 等狀態數值
 */

/**
 * 取得台灣時間（CST，UTC+8）
 */
function getTaiwanTime(): Date {
  const now = new Date();
  const taiwanOffset = 8 * 60; // UTC+8
  const taiwanTime = new Date(now.getTime() + (taiwanOffset - now.getTimezoneOffset()) * 60000);
  return taiwanTime;
}

/**
 * 根據時間計算 energy 和 mood（SDD v2.1 表 2.7）
 */
export function calculateTimeBasedState(): { energy: number; mood: string } {
  const taiwanTime = getTaiwanTime();
  const hour = taiwanTime.getHours();

  // 06:00–09:00：期待（討飯模式）
  if (hour >= 6 && hour < 9) {
    return { energy: 60, mood: '期待（討飯模式）' };
  }
  // 10:00–14:00：活躍
  if (hour >= 10 && hour < 14) {
    return { energy: 80, mood: '活躍' };
  }
  // 14:00–17:00：慵懶（午睡時段）
  if (hour >= 14 && hour < 17) {
    return { energy: 30, mood: '慵懶（午睡時段）' };
  }
  // 17:00–20:00：期待（等主人回家）
  if (hour >= 17 && hour < 20) {
    return { energy: 70, mood: '期待（等主人回家）' };
  }
  // 20:00–23:00：放鬆
  if (hour >= 20 && hour < 23) {
    return { energy: 50, mood: '放鬆' };
  }
  // 23:00–06:00：睏睏（催你睡覺）
  return { energy: 20, mood: '睏睏（催你睡覺）' };
}

/**
 * 根據天氣代碼轉換為 mood（SDD v2.1 表 2.7）
 * OpenWeatherMap 代碼範圍：
 * - 200–299：打雷 → 害怕
 * - 300–599：下雨 → 煩躁或黏人
 * - 600–699：下雪 → 寒冷黏人
 * - 800：晴天 → 慵懶曬太陽
 * - 801–899：陰天 → 慵懶
 */
export function weatherCodeToMood(weatherCode: number | null): string | null {
  if (weatherCode == null) return null;

  // 打雷：200–299
  if (weatherCode >= 200 && weatherCode < 300) {
    return '害怕';
  }
  // 下雨：300–599
  if (weatherCode >= 300 && weatherCode < 600) {
    return '煩躁或黏人';
  }
  // 下雪：600–699
  if (weatherCode >= 600 && weatherCode < 700) {
    return '寒冷黏人';
  }
  // 晴天：800
  if (weatherCode === 800) {
    return '慵懶曬太陽';
  }
  // 陰天：801–899
  if (weatherCode >= 801 && weatherCode < 900) {
    return '慵懶';
  }

  // 預設：未知天氣代碼
  return null;
}

/**
 * 合併時間和天氣 mood
 * 如果天氣 mood 存在，優先使用天氣 mood；否則使用時間 mood
 */
export function mergeMood(timeMood: string, weatherMood: string | null): string {
  return weatherMood || timeMood;
}

/**
 * 計算 hunger（SDD v2.1）
 * 距離上次開啟 App 越久，hunger 值越高
 * 這個計算應該在前端進行，因為需要知道上次開啟時間
 * 這裡提供一個輔助函數來計算 hunger 值
 */
export function calculateHunger(hoursSinceLastOpen: number): number {
  // hunger 範圍：0-100
  // 每小時增加約 5-10，上限 100
  const hunger = Math.min(100, Math.floor(hoursSinceLastOpen * 7));
  return hunger;
}

/**
 * 取得今天的日期（台灣時間，用於查詢 daily_context）
 */
export function getTodayTaiwanDate(): string {
  const taiwanTime = getTaiwanTime();
  const year = taiwanTime.getFullYear();
  const month = String(taiwanTime.getMonth() + 1).padStart(2, '0');
  const day = String(taiwanTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
