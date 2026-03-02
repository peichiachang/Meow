/**
 * 依使用者輸入關鍵字匹配罐頭訊息
 * 匹配到關鍵字後，從 CANNED_MESSAGES（鏟屎官/本喵 200 則）依貓咪個性抽一句回傳
 */

import { CANNED_MESSAGES } from './cannedMessages';

export type KeywordCanned = {
  keywords: string[];
  /** 選填；有貓咪個性時只在此個性組合下才視為匹配 */
  personalities?: string[];
};

/** 關鍵字組：使用者輸入包含任一時即匹配，再依個性從 CANNED_MESSAGES 取文 */
export const KEYWORD_CANNED: KeywordCanned[] = [
  { keywords: ['餓', '餓了', '吃飯', '餵', '飼料', '罐頭', '罐罐', '開飯', '放飯', '餵食', '零食', '肉泥', '肉條', '點心', '肚子餓'] },
  { keywords: ['你好', '哈囉', '嗨', '嗨嗨', '嘿', '喵', '喵喵', '在嗎', '在不在'] },
  { keywords: ['回來', '我回來了', '到家', '剛回家'] },
  { keywords: ['玩', '陪', '遊戲', '逗貓', '逗貓棒', '雷射', '紅點點', '羽毛', '球'] },
  { keywords: ['摸', '抱', '撸', '擼', '揉', '摸摸', '抱抱', '擼貓', '吸貓', '討摸', '撒嬌', '摸頭'] },
  { keywords: ['睡覺', '睡', '睏', '想睡', '晚安', '睏了', '想睡了'] },
  { keywords: ['乖', '聽話', '好乖'] },
  { keywords: ['愛你', '喜歡', '想你', '想我', '好想你', '想你了'] },
  { keywords: ['幹嘛', '在做什麼', '在幹嘛', '在做啥', '怎麼了'] },
  { keywords: ['早安', '早上', '早', '起床', '起來', '起床了'] },
  { keywords: ['午安', '下午'] },
  { keywords: ['晚安'] },
  { keywords: ['謝謝', '感謝'] },
  { keywords: ['對不起', '抱歉', '不好意思'] },
  { keywords: ['怕', '嚇', '可怕', '嚇到'] },
  { keywords: ['累', '辛苦', '好累', '好累喔'] },
  { keywords: ['地盤', '我的', '不准'] },
  { keywords: ['陪我', '理我', '理一下', '看看我', '注意我', '不要不理我'] },
  { keywords: ['無聊', '好無聊', '無聊死了'] },
  { keywords: ['可愛', '好可愛', '萌萌', '萌'] },
  { keywords: ['洗澡', '洗香香', '洗澡澡'] },
  { keywords: ['貓', '貓咪', '主子', '陛下', '喵星人'] },
  { keywords: ['掰掰', '再見', '出門', '上班', '上學', '出門了'] },
  { keywords: ['搗蛋', '調皮', '壞', '壞壞', '調皮鬼'] },
  { keywords: ['理毛', '梳毛', '梳一下', '梳毛毛'] },
  { keywords: ['冷', '好冷', '冷死了'] },
  { keywords: ['拍照', '拍照照', '看鏡頭'] },
];

/** 從 CANNED_MESSAGES 中依貓咪個性篩選，隨機回傳一則（無個性則從全部隨機） */
function getRandomCannedByPersonality(personality: string[] | null | undefined): string {
  const set = personality?.length ? new Set(personality) : null;
  const pool = set
    ? CANNED_MESSAGES.filter((m) => m.personalities.length > 0 && m.personalities.every((p) => set.has(p)))
    : CANNED_MESSAGES;
  const list = pool.length > 0 ? pool : CANNED_MESSAGES;
  return list[Math.floor(Math.random() * list.length)].text;
}

/**
 * 依使用者輸入與貓咪個性，回傳匹配的罐頭訊息；無匹配則回傳 null（改走 AI）。
 * 有匹配關鍵字時，從 200 則罐頭（鏟屎官/本喵）中依個性隨機取一句。
 */
export function getKeywordCannedReply(
  userMessage: string,
  personality?: string[] | null
): string | null {
  const trimmed = userMessage.trim();
  if (!trimmed) return null;

  for (const entry of KEYWORD_CANNED) {
    const hasKeyword = entry.keywords.some((kw) => trimmed.includes(kw));
    if (!hasKeyword) continue;
    if (personality?.length && entry.personalities?.length) {
      const catSet = new Set(personality);
      const allMatch = entry.personalities.every((p) => catSet.has(p));
      if (!allMatch) continue;
    }
    return getRandomCannedByPersonality(personality);
  }

  return null;
}
