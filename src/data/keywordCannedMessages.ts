/**
 * 依使用者輸入關鍵字匹配罐頭訊息
 * 流程：使用者訊息 → 抓關鍵字 → 對應表找罐頭編號 → 個性篩選（第二維度）→ 隨機回覆
 */

import type { SlotOverrides } from './cannedSlotTaxonomy';
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
 * 先從罐頭關鍵字對應表做關鍵字匹配，再以個性篩選後隨機取一則，並套用 slot 抽換增加變化。
 * @param excludeTexts 要排除的罐頭內容（例如上一則回覆），可避免同一輸入重複回同一則
 * @param skipSlotSubstitution 若為 true 則不套用 slot 抽換（供測試用）
 * @param slotOverrides 依貓咪檔案覆寫的 slot（如 subject: 貓咪自稱「朕」）
 * @param preferences 貓咪喜歡的內容（提高相關罐頭被選中機率）
 * @param dislikes 貓咪討厭的內容（排除提到該內容的罐頭）
 */
export function getKeywordCannedReply(
  userMessage: string,
  personality?: string[] | null,
  options?: {
    excludeTexts?: string[];
    skipSlotSubstitution?: boolean;
    slotOverrides?: SlotOverrides;
    preferences?: string | null;
    dislikes?: string | null;
  }
): string | null {
  return pickCannedByKeywordAndPersonality(
    userMessage,
    personality,
    options?.excludeTexts,
    options?.skipSlotSubstitution,
    options?.slotOverrides,
    options?.preferences,
    options?.dislikes
  );
}
