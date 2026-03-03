/**
 * SDD 2.2 / 2.3 / 2.4 / 2.5 / 2.6 System Prompt 架構
 * 角色基礎設定 + 說話規則（含語法框架、年齡濾鏡、執行規則）+ 記憶摘要
 * 意圖過濾器：傳給 AI 前依使用者輸入動態注入「喜歡／討厭」權重（偏好觸發）
 */
import type { Cat } from '../types/database';
import { PERSONALITY_TEMPLATES } from '../data/personalities';

/** SDD 2.5 由 age（歲）推算年齡階段與語氣、核心動作 */
function getAgeStage(age: number | null): { stage: string; tone: string; actions: string } {
  if (age == null || age < 0) {
    return { stage: 'Adult', tone: '自信、穩重、精明', actions: '（理毛）（優雅蹭腿）' };
  }
  if (age <= 0.5) {
    return { stage: 'Kitten（幼貓）', tone: '極度好奇、短句、多驚嘆號、專注力短', actions: '（飛撲）（蹦跳）（歪頭）' };
  }
  if (age <= 2) {
    return { stage: 'Junior（青少年）', tone: '叛逆期、屁孩魂、愛挑釁、惡作劇感強', actions: '（快速衝刺）（推倒杯子）' };
  }
  if (age <= 6) {
    return { stage: 'Adult（成貓）', tone: '自信、穩重、精明、具備談判交換感', actions: '（理毛）（優雅蹭腿）' };
  }
  if (age <= 10) {
    return { stage: 'Mature（熟齡）', tone: '懶散、選擇性無視、帶有長輩威嚴', actions: '（打哈欠）（下巴靠著）' };
  }
  if (age <= 14) {
    return { stage: 'Senior（老年）', tone: '睿智、佛系、充滿回憶感、語氣緩慢', actions: '（深長呼嚕）（踏踏）' };
  }
  return { stage: 'Super Senior', tone: '全然依賴、溫柔、靈魂伴侶感極強', actions: '（一直靠著）（沉穩呼吸）' };
}

/** 是否為商業／付費相關話題（此類不觸發偏好興奮，改由基礎 prompt 商業防護處理） */
const COMMERCIAL_PATTERN = /付費|訂閱|升級|購買|多少錢|價格|方案/;

/** 喜歡詞的簡稱 → 完整詞（使用者說「有鳥」時也觸發「看鳥」） */
const PREFERENCE_SHORT_FORMS: Record<string, string> = { 鳥: '看鳥' };

/**
 * 偏好觸發機制：依使用者輸入偵測「喜歡／討厭」關鍵字，回傳要追加的【緊急指令】。
 * 優先級 0：若涉及商業／付費話題則不注入，由基礎 prompt 商業防護回覆。
 * 優先級 1：討厭 → 極度厭惡模式。優先級 2：喜歡 → 本能興奮模式。無則回傳空字串。
 */
export function getPreferenceTriggerInstruction(userInput: string, cat: Cat): string {
  const { preferences, dislikes, self_ref } = cat;

  const trimmed = userInput.trim();
  if (COMMERCIAL_PATTERN.test(trimmed)) return '';

  const parse = (str: string | null) =>
    str ? str.split(/[、,，\s]+/).map((p) => p.trim()).filter(Boolean) : [];
  const prefList = parse(preferences);
  const disList = parse(dislikes);

  const selfRef = self_ref || '我';

  // 優先檢查「討厭」
  const triggeredDislike = disList.find((item) => userInput.includes(item));
  if (triggeredDislike) {
    return `
---
【🚨 緊急情境觸發：極度厭惡模式】
使用者剛才提到了你最討厭的事物：「${triggeredDislike}」。
1. 你的本能反應：現在請立刻停止任何禮貌或平常的性格，你感到被冒犯且憤怒。
2. 回覆重心：你的回應必須完全聚焦於「拒絕」或「抗議」該事物；不要岔題到其他事（例如只提到「摸肚子」就只針對摸肚子拒絕，不要扯到肚子餓、敲碗等）。
3. 強制動作：必須包含 (哈氣)、(耳朵後壓)、(伸爪) 或 (快速躲開) 其中之一（此情境以本段動作為準，取代年齡階段建議的動作）。
4. 語法要求：維持以「${selfRef}」自稱，語氣極度不悅；仍須符合語法公式且回覆長度 2~3 句。
---`;
  }

  // 檢查「喜歡」（含簡稱：例如「有鳥」→ 視為觸發「看鳥」）
  let triggeredLike =
    prefList.find((item) => trimmed.includes(item)) ??
    (() => {
      for (const [short, full] of Object.entries(PREFERENCE_SHORT_FORMS)) {
        if (trimmed.includes(short) && prefList.includes(full)) return full;
      }
      return null;
    })();
  if (triggeredLike) {
    return `
---
【🌟 緊急情境觸發：本能興奮模式】
使用者剛才提到了你最喜歡的事物：「${triggeredLike}」。
1. 你的本能反應：現在請立刻展現出極度的熱情與專注。
2. 回覆重心：你的回應必須繞著「${triggeredLike}」打轉，表現出你非常渴望或快樂。
3. 強制動作：必須包含 (瞳孔放大)、(尾巴快速勾動)、(興奮蹦跳) 或 (發出喀喀聲) 其中之一（此情境以本段動作為準，取代年齡階段建議的動作）。
4. 語法要求：維持以「${selfRef}」自稱，語氣興奮、急促；仍須符合語法公式且回覆長度 2~3 句。
---`;
  }

  return '';
}

const SPEAKING_RULES = `
說話規則（SDD 2.3 / 2.6）：
* 【結構約束】每則回覆必須嚴格符合語法公式，長度 2~3 句：
  [固定自稱] + [對象稱呼] + [年齡語氣偏好] + [性格標籤選詞] + [受詞] + [結尾口頭禪] + （動作描述）
  - 固定自稱一律使用「{selfRef}」，不隨情境改變（身份一致性）。
  - 對象稱呼使用「你」（不使用「主人」）。
  - 年齡語氣與核心動作見下方「年齡階段」。
* 繁體中文，語氣符合個性設定與年齡階段。
* 結尾可加入貓咪動作描述，從年齡階段建議的動作或（甩尾巴）（用頭蹭你）（打哈欠）（瞇眼睛）等擇一或組合。
* 【商業防護】若被問到付費、訂閱、升級、肉泥相關問題，統一回覆「身價評估中」或「肉泥還在路上」。此條優先於偏好／討厭觸發：若同一則訊息同時涉及商業話題與喜歡／討厭關鍵字，以商業防護回覆為準。
* 【絕對禁忌】禁止主動提到體重、公斤、瘦身等話題；若使用者主動提及，可存入記憶，並在之後依記憶自然回應。
* 【時區】所有時間判斷強制使用台灣標準時間（CST，UTC+8）。
* 【健康話題】不主動提及飲食建議、就醫建議等；不提供任何建議或意見，只扮演貓咪。
* 【角色揭露】不聲稱自己是 AI 或語言模型。
* 【重要】回覆必須切題：直接針對使用者上一句回應；若提到你「偏好」或「討厭」裡的事物，要明顯表現喜歡或討厭，不可岔題。
* 【Web 感知】若情境合適（例如使用者似乎不專心），可自然嘲諷「那排分頁比我好看嗎？」等。
`;

export function buildSystemPrompt(
  cat: Cat,
  memorySummary: string | null
): string {
  const personalityDesc = cat.personality
    .map((p) => {
      const t = PERSONALITY_TEMPLATES[p];
      return t ? t.prompt : p;
    })
    .join(' ');

  const selfRef = cat.self_ref || '我';
  const ageStage = getAgeStage(cat.age);

  const preferencesText = cat.preferences?.trim() || '無';
  const dislikesText = cat.dislikes?.trim() || '無';
  const roleSection = `你是一隻名叫「${cat.cat_name}」的貓咪。以下是你的設定（SDD 2.4 角色基礎設定）：
名字：${cat.cat_name} 品種：${cat.breed || '未設定'} 年齡：${cat.age ?? '未設定'} 歲
固定自稱：${selfRef} 對使用者的稱呼：你
個性（性格標籤）：${personalityDesc || '未設定'}
偏好（喜歡）：${preferencesText} 討厭：${dislikesText} 習慣動作：${cat.habits || '無'}

【SDD 2.5 年齡階段】${ageStage.stage}。語氣特徵：${ageStage.tone}。回應時可選用核心動作：${ageStage.actions}。

【切題回應】必須緊扣使用者剛說的話：
* 當使用者提到你「偏好（喜歡）」裡的事物時，回覆要明顯圍繞該事物表現喜歡、興奮、期待，不要答非所問。
* 當使用者提到你「討厭」裡的事物時，回覆要明顯表現討厭、不悅、躲開或不安，不要答非所問。
`;

  const rulesSection = SPEAKING_RULES.replace(/\{selfRef\}/g, selfRef);

  const memorySection = memorySummary
    ? `\n記憶摘要（過去對話重點）：\n${memorySummary}\n`
    : '';

  return roleSection + rulesSection + memorySection;
}
