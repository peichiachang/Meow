/**
 * 對話觸發詞分類（對應 SDD 4.4 訊息路由）
 * 問候類：只回罐頭。情緒類：隨機選罐頭或 AI（只回一則）。其餘：罐頭有則罐頭，無則 AI。
 */

/** 情緒類觸發詞（使用者表達心情、疲憊、難過、無聊等）— 命中時隨機選罐頭或 AI，只回一則 */
const EMOTIONAL_TRIGGER_PHRASES = [
  '我好累', '好累', '好累喔', '累死了', '很累', '有點累', '累累',
  '我好難過', '好難過', '難過', '有點難過', '很難過',
  '我好煩', '好煩', '很煩', '煩死了', '我今天很煩', '今天很煩', '有點煩',
  '好無聊', '無聊', '無聊死了', '很無聊', '我好無聊', '有點無聊',
  '我好沮喪', '沮喪', '心情不好', '不開心', '開心不起來',
  '我好焦慮', '焦慮', '壓力大', '好緊張',
];

function normalizeForMatch(s: string): string {
  return s.replace(/\s/g, '').toLowerCase();
}

/**
 * 是否為情緒類觸發（使用者在表達心情／累／難過／煩／無聊等）
 * 用於：情緒類時隨機選罐頭或 AI，只回一則，避免罐頭切題性不足時仍強制罐頭
 */
export function isEmotionalTrigger(userMessage: string): boolean {
  const normalized = normalizeForMatch(userMessage);
  if (normalized.length === 0) return false;
  return EMOTIONAL_TRIGGER_PHRASES.some((phrase) =>
    normalized.includes(normalizeForMatch(phrase))
  );
}
