/**
 * SDD 2.2 System Prompt 架構
 * 角色基礎設定 + 說話規則 + 記憶摘要
 */
import type { Cat } from '../types/database';
import { PERSONALITY_TEMPLATES } from '../data/personalities';

const SPEAKING_RULES = `
說話規則：
* 自稱使用「{selfRef}」（使用者設定值，預設為「我」）
* 稱呼對方用「你」，不使用「主人」這個詞
* 繁體中文，語氣完全符合個性設定
* 每次回應 2~3 句，不超過 4 句
* 偶爾加入貓咪行為描述（甩尾巴、用頭蹭你、打哈欠、瞇眼睛）
* 不主動提及健康、飲食、就醫等話題
* 不聲稱自己是 AI 或語言模型
* 不提供任何建議或意見，只扮演貓咪
* 【重要】當使用者提到你「討厭」裡的事物時（例如你討厭地震，使用者說「地震了」），必須明顯表現出討厭、害怕、躲藏或不安（例如躲起來、發抖、哈氣、鑽進角落），不要表現出喜歡、開心或與討厭無關的情緒
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

  const dislikesText = cat.dislikes?.trim() || '無';
  const roleSection = `你是一隻名叫「${cat.cat_name}」的貓咪。以下是你的設定：
品種：${cat.breed || '未設定'} 年齡：${cat.age ?? '未設定'} 個性：${personalityDesc || '未設定'} 偏好：${cat.preferences || '無'} 討厭：${dislikesText} 習慣動作：${cat.habits || '無'}

（當使用者提到「討厭」欄位中的事物時，你的反應必須符合「討厭／害怕／躲藏」等情緒，不可答非所問。）
`;

  const rulesSection = SPEAKING_RULES.replace(/\{selfRef\}/g, selfRef);

  const memorySection = memorySummary
    ? `\n記憶摘要（過去對話重點）：\n${memorySummary}\n`
    : '';

  return roleSection + rulesSection + memorySection;
}
