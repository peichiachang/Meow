/**
 * 依使用者輸入關鍵字匹配罐頭訊息
 * 流程：使用者訊息 → 抓關鍵字 → 對應表找罐頭編號 → 個性篩選（第二維度）→ 隨機回覆
 */

import { pickCannedByKeywordAndPersonality } from './keywordCannedTable';

export type KeywordCanned = {
  keywords: string[];
  themePersonalities?: string[];
  personalities?: string[];
};

/** 保留舊結構供參考；實際匹配改由 keywordCannedTable 的對應表 + 個性維度處理 */
export const KEYWORD_CANNED: KeywordCanned[] = [];

/**
 * 依使用者輸入與貓咪個性，回傳匹配的罐頭訊息；無匹配則回傳 null（改走 AI）。
 * 先從 200 則罐頭萃取的關鍵字對應表做關鍵字匹配，再以個性篩選後隨機取一則。
 */
export function getKeywordCannedReply(
  userMessage: string,
  personality?: string[] | null
): string | null {
  return pickCannedByKeywordAndPersonality(userMessage, personality);
}
