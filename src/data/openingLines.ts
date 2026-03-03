/**
 * SDD 4.2 / 4.5 開場白設計
 * 開場白：時間、等待、隨機行為、天氣（選填，需位置授權）
 */

import type { WeatherCondition } from '../services/weatherService';

export type OpeningContext = {
  hour: number;
  hoursSinceLastOpen: number | null; // 距離上次開啟的小時數，null 表示首次
  personality?: string[];
  /** 選填：取得位置授權後由 weatherService 提供 */
  weather?: WeatherCondition | null;
};

function getTimeBasedLines(hour: number): string[] {
  if (hour >= 22 || hour < 6) {
    return [
      '都這麼晚了，你終於回來了。',
      '這麼晚還不睡？我等你很久了。',
      '喵...你吵到我了，我剛剛在睡覺。',
    ];
  }
  if (hour >= 6 && hour < 12) {
    return [
      '早安，你醒了。',
      '早上好，今天天氣如何？',
      '你終於起床了，我餓了。',
    ];
  }
  if (hour >= 12 && hour < 18) {
    return [
      '下午了，你在忙什麼？',
      '嗯，你來了。',
      '...（抬頭看你一眼，繼續舔爪子）',
    ];
  }
  return [
    '你回來了。',
    '嗯，歡迎回來。',
    '...（走過來蹭了你一下）',
  ];
}

function getWaitBasedLines(hoursSinceLastOpen: number): string[] {
  if (hoursSinceLastOpen >= 24) {
    return [
      '你很久沒來了...我還以為你忘記我了。',
      '好久不見。你去哪了？',
      '...（盯著你看了一會）你終於來了。',
    ];
  }
  if (hoursSinceLastOpen >= 12) {
    return [
      '我等你很久了。',
      '你終於來了。',
      '...（從角落走出來）你來了啊。',
    ];
  }
  if (hoursSinceLastOpen >= 2) {
    return [
      '你又來了。',
      '嗯。',
      '...（甩了甩尾巴）',
    ];
  }
  return [];
}

function getRandomBehaviorLines(): string[] {
  return [
    '我剛才在睡覺，你吵到我了。',
    '...（打了一個大大的哈欠）',
    '那個會動的東西是什麼？（盯著螢幕）',
    '你手上有罐罐的味道嗎？',
    '...（用頭蹭了蹭你的手）',
    '今天陽光不錯，適合曬太陽。',
    '你擋到我的路了。',
    '...（瞇起眼睛）',
  ];
}

/** SDD 4.5 開場白天氣（選填）：依天氣條件回傳對應開場白 */
function getWeatherBasedLines(condition: WeatherCondition): string[] {
  switch (condition) {
    case 'rain':
      return [
        '外面好像在下雨，我不喜歡雷聲。',
        '...（望著窗外）又濕又冷，還是家裡好。',
        '你淋濕了嗎？快點擦乾，別把地板弄濕。',
      ];
    case 'thunder':
      return [
        '外面在打雷...我有點怕。',
        '那個聲音好大，你不怕嗎？',
        '...（縮在角落）雷聲什麼時候會停？',
      ];
    case 'snow':
      return [
        '外面白白的，那是什麼？',
        '好冷喔，你不准開窗。',
        '...（盯著窗外）那個白白的一直掉下來。',
      ];
    case 'cloudy':
      return [
        '今天沒什麼太陽，適合睡覺。',
        '外面灰灰的，你也要出門嗎？',
        '...（打哈欠）這種天氣最適合窩著。',
      ];
    case 'sunny':
      return [
        '今天陽光不錯，適合曬太陽。',
        '外面好亮，你要不要開窗讓我看看？',
        '...（瞇起眼睛）太陽曬得我好舒服。',
      ];
    default:
      return [];
  }
}

export function getOpeningLine(
  catName: string,
  context: OpeningContext
): string {
  const fallbackLines: string[] = [
    `...（${catName} 抬頭看了你一眼）`,
    ...getTimeBasedLines(context.hour),
  ];

  if (context.hoursSinceLastOpen !== null) {
    fallbackLines.push(...getWaitBasedLines(context.hoursSinceLastOpen));
  }

  if (context.weather) {
    fallbackLines.push(...getWeatherBasedLines(context.weather));
  }

  fallbackLines.push(...getRandomBehaviorLines());

  return fallbackLines[Math.floor(Math.random() * fallbackLines.length)];
}
