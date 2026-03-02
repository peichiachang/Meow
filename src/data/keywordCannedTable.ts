/**
 * 關鍵字 ↔ 罐頭編號 對應表
 * 從 200 則罐頭內容萃取關鍵字，建立「關鍵字 → 罐頭索引[]」；
 * 使用者訊息先做關鍵字匹配，再以個性為第二維度篩選後隨機回覆。
 */

import { CANNED_MESSAGES } from './cannedMessages';

/** 用於匹配的關鍵字（使用者可能輸入 或 罐頭內容會出現的詞），長關鍵字放前面以優先匹配 */
const MASTER_KEYWORDS = [
  '我回來了', '剛回家', '在幹嘛', '在做什麼', '在做啥', '起床了', '想你了', '好想你', '肚子餓', '不要不理我',
  '你有吃飯嗎', '吃飯了', '吃飯沒', '掃地機器人', '發光的小板子', '喵喵叫不停', '鏟屎官', '本喵', '奴才',
  '罐頭', '罐罐', '開飯', '放飯', '餵食', '吃飯', '餓了', '餵', '飼料', '零食', '肉泥', '肉條', '點心', '乾乾', '碗', '冰箱', '廚房', '飯點', '餵食時間', '開罐頭', '雞肉味', '肉包', '雞肉條', '美味', '填飽肚子',
  '回來', '到家', '回來了', '下班', '終於回來', '準時回來', '回來的時間',
  '摸', '抱', '撸', '擼', '揉', '摸摸', '抱抱', '擼貓', '吸貓', '討摸', '撒嬌', '摸頭', '蹭', '肚皮', '膝蓋', '靠著', '趴', '抱一下', '摸一下',
  '玩', '遊戲', '逗貓', '逗貓棒', '雷射', '紅點點', '羽毛', '球', '躲貓貓', '轉圈', '追尾巴', '尾巴', '興奮跳動', '原地蹦跳', '瘋狂', '後空翻', '特技',
  '睡覺', '睡', '睏', '想睡', '晚安', '睏了', '想睡了', '休息', '賴床', '閉上眼睛', '打哈欠', '呼嚕',
  '你好', '哈囉', '嗨', '嘿', '喵', '喵喵', '在嗎', '在不在', '怎麼了',
  '乖', '聽話', '好乖',
  '愛你', '喜歡', '想你', '想我', '愛', '想',
  '早安', '早上', '早', '起床', '起來', '太陽出來', '晨跑',
  '午安', '下午',
  '謝謝', '感謝',
  '對不起', '抱歉', '不好意思',
  '怕', '嚇', '可怕', '嚇到', '雷聲', '打雷', '怪獸', '吸塵器', '黑影', '躲', '紙箱', '沙發下', '被窩',
  '累', '辛苦', '好累', '好累喔', '累累', '很累', '想睡了', '睏了', '無聊死了',
  '地盤', '不准', '我的', '獵物', '佔領',
  '陪我', '理我', '理一下', '看看我', '注意我', '理我一下', '可愛', '萌萌', '萌', '翻滾', '表演',
  '無聊', '好無聊',
  '洗澡', '洗香香', '有水的地方',
  '貓', '貓咪', '主子', '陛下', '喵星人',
  '掰掰', '再見', '出門', '上班', '上學', '出門了', '去哪裡',
  '搗蛋', '調皮', '壞', '壞壞', '調皮鬼',
  '理毛', '梳毛', '梳一下', '梳毛毛', '梳',
  '冷', '好冷', '冷死了', '毯子', '取暖', '打冷顫', '感冒',
  '拍照', '拍照照', '看鏡頭', '手機', '記憶體', '拍',
  '鍵盤', '手機', '黑塊', '螢幕', '板子', '發光', '小人',
  '哈氣', '瞇眼睛', '甩尾巴', '舔爪子', '舔嘴巴', '含住', '咬', '嗅', '用頭撞你', '蹭你的腿', '蹭你的手', '靠在你腿邊', '趴在你膝蓋', '坐在手機上', '躺在鍵盤上', '盯著', '歪頭', '望向窗外', '縮起脖子', '壓低身體', '踩小碎步', '繞著你轉圈',
  '花盆', '地毯', '蒼蠅', '麻雀', '影子', '蟲子', '月亮', '鳥', '衛生紙', '拖鞋', '襪子', '鑰匙', '沙發', '抽屜', '書桌', '紙張', '衣櫥', '門把', '電線', '蟑螂',
  '瘦小腹', '運動', '零食', '52公斤',
  '懶散', '疲憊', '電力', '枕頭', '床位', '夢鄉', '秒睡', '助眠', '美容覺', '逃生', '被窩',
];

/** 關鍵字 → 罐頭索引[]（該關鍵字出現在「罐頭內容」裡的編號） */
function buildKeywordToIndices(): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const kw of MASTER_KEYWORDS) {
    const indices: number[] = [];
    CANNED_MESSAGES.forEach((msg, i) => {
      if (msg.text.includes(kw)) indices.push(i);
    });
    if (indices.length > 0) map.set(kw, indices);
  }
  return map;
}

const _contentMap = buildKeywordToIndices();

/** 使用者常輸入但罐頭文案未必出現的詞 → 用哪些「內容關鍵字」去查表（對應到同主題罐頭） */
const USER_KEYWORD_TO_CONTENT: Record<string, string[]> = {
  '吃飯': ['罐頭', '餓', '開飯', '碗', '餵', '冰箱', '零食', '飯點', '餵食'],
  '餓了': ['餓', '罐頭', '碗', '開飯', '肚子', '餵食'],
  '肉泥': ['罐頭', '零食', '餵', '碗', '雞肉'],
  '肉條': ['肉條', '罐頭', '零食', '餵'],
  '罐罐': ['罐頭', '罐罐', '開飯', '碗'],
  '餵食': ['餵', '餵食', '開飯', '碗', '罐頭'],
  '開飯': ['開飯', '飯點', '碗', '罐頭', '餵食'],
  '放飯': ['開飯', '碗', '罐頭', '餵食'],
  '飼料': ['飼料', '碗', '乾乾', '罐頭'],
  '點心': ['零食', '罐頭', '碗'],
  '肚子餓': ['餓', '肚子', '碗', '開飯'],
  '在嗎': ['奴才', '鏟屎官', '理我'],
  '在不在': ['奴才', '鏟屎官'],
  '怎麼了': ['幹嘛', '奴才', '鏟屎官'],
  '想睡了': ['睡', '晚安', '睏', '閉上眼睛', '打哈欠'],
  '睏了': ['睡', '睏', '晚安', '休息', '打哈欠'],
  '睡覺了嗎': ['睡', '晚安', '睏', '休息', '打哈欠', '閉上眼睛'],
  '睡了嗎': ['睡', '晚安', '睏', '打哈欠'],
  '有沒有睡': ['睡', '晚安', '睏', '休息'],
  '在睡嗎': ['睡', '晚安', '睏'],
  '要睡了': ['睡', '晚安', '閉上眼睛', '打哈欠'],
  '睡了沒': ['睡', '晚安', '睏'],
  '想睡覺': ['睡', '晚安', '睏', '休息', '打哈欠'],
  '吃飯了嗎': ['罐頭', '餓', '開飯', '碗', '餵', '冰箱', '飯點'],
  '吃飯了沒': ['罐頭', '餓', '開飯', '碗', '餵'],
  '有沒有吃飯': ['罐頭', '餓', '開飯', '碗'],
  '回來了': ['回來', '到家', '下班', '奴才', '鏟屎官'],
  '回家了': ['回來', '到家', '奴才', '鏟屎官'],
  '好累喔': ['累', '休息', '趴在你膝蓋', '靠在你腿邊'],
  '好無聊': ['無聊', '玩', '甩尾巴'],
  '無聊死了': ['無聊', '玩'],
  '萌萌': ['可愛', '蹭你的腿', '傻萌'],
  '萌': ['可愛', '蹭你的腿'],
  '洗香香': ['洗澡', '有水'],
  '洗澡澡': ['洗澡', '有水'],
  '出門了': ['出門', '回來', '下班', '再見'],
  '壞壞': ['搗蛋', '屁孩', '哈氣'],
  '調皮鬼': ['調皮', '屁孩'],
  '梳毛毛': ['梳', '理毛', '梳毛'],
  '好冷': ['冷', '毯子', '取暖', '打冷顫'],
  '冷死了': ['冷', '毯子', '取暖'],
  '拍照照': ['拍照', '手機', '拍'],
  '看鏡頭': ['拍照', '手機'],
};

/** 關鍵字 → 罐頭索引[]（內容關鍵字＋使用者詞對應到內容關鍵字後的聯集） */
export const KEYWORD_TO_CANNED_INDICES = (() => {
  const map = new Map<string, number[]>(_contentMap);
  for (const [userKw, contentKws] of Object.entries(USER_KEYWORD_TO_CONTENT)) {
    const set = new Set<number>();
    for (const c of contentKws) {
      const list = _contentMap.get(c);
      if (list) list.forEach((i) => set.add(i));
    }
    if (set.size > 0) map.set(userKw, Array.from(set));
  }
  return map;
})();

/** 取得「使用者訊息中出現」的關鍵字（依 MASTER_KEYWORDS 長度優先匹配） */
export function getMatchedKeywords(userMessage: string): string[] {
  const trimmed = userMessage.trim();
  if (!trimmed) return [];
  const matched: string[] = [];
  for (const kw of MASTER_KEYWORDS) {
    if (trimmed.includes(kw)) matched.push(kw);
  }
  return matched;
}

/**
 * 依關鍵字與貓咪個性，從 200 則罐頭中篩選候選並隨機回傳一則的 text；無候選則回傳 null。
 * @param excludeTexts 要排除的罐頭內容（例如上一則回覆），可避免同一輸入一直回同一則
 */
export function pickCannedByKeywordAndPersonality(
  userMessage: string,
  personality: string[] | null | undefined,
  excludeTexts?: string[]
): string | null {
  const keywords = getMatchedKeywords(userMessage);
  if (keywords.length === 0) return null;

  const candidateIndices = new Set<number>();
  for (const kw of keywords) {
    const indices = KEYWORD_TO_CANNED_INDICES.get(kw);
    if (indices) indices.forEach((i) => candidateIndices.add(i));
  }
  if (candidateIndices.size === 0) return null;

  const catSet = personality?.length ? new Set(personality) : null;
  const filtered = Array.from(candidateIndices).filter((i) => {
    const msg = CANNED_MESSAGES[i];
    if (!msg.personalities.length) return true;
    if (!catSet) return true;
    return msg.personalities.every((p) => catSet.has(p));
  });

  let pool = filtered.length > 0 ? filtered : (catSet ? [] : Array.from(candidateIndices));
  if (pool.length === 0) return null;

  const excludeSet = excludeTexts?.length ? new Set(excludeTexts) : null;
  if (excludeSet?.size) {
    const withoutRecent = pool.filter((i) => !excludeSet.has(CANNED_MESSAGES[i].text));
    if (withoutRecent.length > 0) pool = withoutRecent;
  }

  const idx = pool[Math.floor(Math.random() * pool.length)];
  return CANNED_MESSAGES[idx].text;
}
