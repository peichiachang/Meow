/**
 * 罐頭句型 slot 詞庫：辨識罐頭內「主詞／稱呼／狀態／動詞／結尾／動作」等屬性，
 * 回傳時可從同屬性詞庫隨機抽換，增加同一則罐頭的變化。
 */

export const CANNED_SLOT_TAXONOMY = {
  /** 自稱（主詞） */
  subject: ['本喵', '我', '本大爺'],
  /** 對人類的稱呼 */
  address: ['奴才', '鏟屎官', '這隻人類', '餵飯的'],
  /** 狀態／心情描述 */
  state: ['肚子餓扁了', '電力只剩 1%', '看透貓生', '心情極好', '覺得你很煩'],
  /** 動作動詞 */
  verb: ['開罐頭', '抓沙發', '踩肚子', '哈氣', '蹭腿', '理毛'],
  /** 結尾語 */
  ending: ['懂了嗎？', '不准賴床！', '真拿你沒辦法', '喵嗚！'],
  /** 括號內動作（支援半形/全形括號） */
  action: ['(甩尾巴)', '(發出呼嚕聲)', '(瞇眼睛)', '(舔爪子)'],
} as const;

export type SlotCategory = keyof typeof CANNED_SLOT_TAXONOMY;

/** 每個 action 的全形括號版本，用於在罐頭內文比對與替換 */
const ACTION_FULL_WIDTH = CANNED_SLOT_TAXONOMY.action.map((s) =>
  s.replace(/\(/g, '（').replace(/\)/g, '）')
);

/**
 * 從同一屬性的詞庫中隨機挑一個（不依賴外部 random，方便測試時可注入）
 */
function pickOne<T>(arr: readonly T[], random = Math.random): T {
  return arr[Math.floor(random() * arr.length)];
}

/** 可依貓咪檔案覆寫的 slot（例如自稱「朕」） */
export type SlotOverrides = Partial<Record<SlotCategory, string>>;

/**
 * 對罐頭內文做 slot 抽換：辨識各屬性詞，用「同屬性詞庫」中隨機一詞替換，
 * 同一句內同一屬性只會換成同一個詞。若傳入 slotOverrides（如 subject: "朕"），
 * 則該屬性使用覆寫值，不隨機抽選。
 * @param text 原始罐頭內文
 * @param random 可選的隨機函數（預設 Math.random）
 * @param slotOverrides 依貓咪檔案覆寫的 slot（如自稱 subject: "朕"）
 * @returns 抽換後的內文
 */
export function substituteCannedSlots(
  text: string,
  random: () => number = Math.random,
  slotOverrides?: SlotOverrides
): string {
  let result = text;

  const categories = Object.keys(CANNED_SLOT_TAXONOMY) as SlotCategory[];

  for (const cat of categories) {
    const terms = CANNED_SLOT_TAXONOMY[cat] as readonly string[];
    const override = slotOverrides?.[cat];
    const chosen = override != null && override !== '' ? override : pickOne(terms, random);

    if (cat === 'action') {
      // action 要同時替換半形與全形括號版本；替換時用 chosen 的括號風格
      const chosenFull = chosen.replace(/\(/g, '（').replace(/\)/g, '）');
      for (let i = 0; i < terms.length; i++) {
        const half = terms[i];
        const full = ACTION_FULL_WIDTH[i];
        result = result.split(half).join(chosen);
        result = result.split(full).join(chosenFull);
      }
      continue;
    }

    // 長詞先替換，避免「本」誤替換「本喵」等
    const sorted = [...terms].sort((a, b) => b.length - a.length);
    for (const term of sorted) {
      if (result.includes(term)) {
        result = result.split(term).join(chosen);
      }
    }
  }

  return result;
}
