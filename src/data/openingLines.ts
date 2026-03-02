/**
 * SDD 4.2 開場白設計
 * 100 組罐頭訊息（依個性匹配）+ 預設庫（時間、等待、行為）
 */

import { CANNED_MESSAGES } from './cannedMessages';

export type OpeningContext = {
  hour: number;
  hoursSinceLastOpen: number | null; // 距離上次開啟的小時數，null 表示首次
  personality?: string[];
};

function getPersonalityMatchedLines(personality: string[]): string[] {
  if (!personality || personality.length === 0) return [];

  const matched: string[] = [];
  const catPersonalitySet = new Set(personality);
  for (const msg of CANNED_MESSAGES) {
    const allMatch = msg.personalities.every((p) => catPersonalitySet.has(p));
    if (allMatch && msg.personalities.length > 0) {
      matched.push(msg.text);
    }
  }
  return matched;
}

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

export function getOpeningLine(
  catName: string,
  context: OpeningContext
): string {
  // 有個性匹配的罐頭訊息時，優先 100% 使用
  if (context.personality?.length) {
    const personalityLines = getPersonalityMatchedLines(context.personality);
    if (personalityLines.length > 0) {
      return personalityLines[Math.floor(Math.random() * personalityLines.length)];
    }
  }

  // 無匹配時使用預設庫
  const fallbackLines: string[] = [
    `...（${catName} 抬頭看了你一眼）`,
    ...getTimeBasedLines(context.hour),
  ];

  if (context.hoursSinceLastOpen !== null) {
    fallbackLines.push(...getWaitBasedLines(context.hoursSinceLastOpen));
  }

  fallbackLines.push(...getRandomBehaviorLines());

  return fallbackLines[Math.floor(Math.random() * fallbackLines.length)];
}
