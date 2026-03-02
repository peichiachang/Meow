/**
 * 依使用者輸入關鍵字匹配的罐頭訊息
 * 使用者打了包含關鍵字的內容時，回傳對應罐頭（可依貓咪個性篩選）
 */

export type KeywordCanned = {
  /** 任一關鍵字被使用者輸入包含即匹配 */
  keywords: string[];
  text: string;
  /** 選填；有貓咪個性時可只從符合個性的罐頭中選 */
  personalities?: string[];
};

export const KEYWORD_CANNED: KeywordCanned[] = [
  // 餓 / 吃 / 飯 / 罐頭
  { keywords: ['餓', '吃飯', '餵', '飼料', '罐頭', '罐罐'], text: '你剛剛是不是開了冰箱？那個聲音我認得，絕對是罐頭的味道！（盯著你的手）', personalities: ['吃貨'] },
  { keywords: ['餓', '吃飯', '餵', '飼料', '罐頭', '罐罐'], text: '喵！既然你提到了，現在應該是開飯時間吧？我已經在碗旁邊等你了。（盯著你的手）' },
  { keywords: ['餓', '吃飯', '餵', '飼料', '罐頭', '罐罐'], text: '嗯，你終於想起來要餵我了。快點，我肚子早就扁了。（用頭撞你）' },
  { keywords: ['餓', '吃飯', '餵', '飼料', '罐頭', '罐罐'], text: '......。（盯著碗看）' },
  // 你好 / 哈囉 / 嗨
  { keywords: ['你好', '哈囉', '嗨', '嗨嗨', '嘿'], text: '嗯，你來了。（瞇眼睛）' },
  { keywords: ['你好', '哈囉', '嗨', '嗨嗨', '嘿'], text: '喵～（甩了甩尾巴）' },
  { keywords: ['你好', '哈囉', '嗨', '嗨嗨', '嘿'], text: '哇！是世界上最棒的人！看到你我整隻貓都亮了起來！（蹭你的腿）', personalities: ['熱情'] },
  { keywords: ['你好', '哈囉', '嗨', '嗨嗨', '嘿'], text: '......。（走過來蹭你）', personalities: ['安靜'] },
  // 回來 / 我回來了
  { keywords: ['回來', '我回來了', '到家'], text: '你終於回來了。我等好久好久了！（繞著你轉圈）', personalities: ['黏人'] },
  { keywords: ['回來', '我回來了', '到家'], text: '我才不是在等你，只是剛好想在這裡拉伸。既然你回來了，就勉為其難讓你摸一下。（甩尾巴）', personalities: ['傲嬌'] },
  { keywords: ['回來', '我回來了', '到家'], text: '嗯，你回來了。我也沒幹嘛，就只是待著而已。（瞇眼睛）' },
  { keywords: ['回來', '我回來了', '到家'], text: '...（走過來蹭了你一下）' },
  // 玩 / 陪 / 遊戲 / 逗貓
  { keywords: ['玩', '陪', '遊戲', '逗貓', '逗貓棒', '雷射'], text: '嘿！快看我！我們現在來玩好不好？（興奮跳動）', personalities: ['活潑'] },
  { keywords: ['玩', '陪', '遊戲', '逗貓', '逗貓棒', '雷射'], text: '那個紅點點不見了，它是不是鑽進牆壁裡面了呀？（歪頭看地板）', personalities: ['傻萌'] },
  { keywords: ['玩', '陪', '遊戲', '逗貓', '逗貓棒', '雷射'], text: '年輕時我也愛追羽毛，現在覺得睡覺更有意義。你也坐下來休息吧。（打哈欠）', personalities: ['老成'] },
  { keywords: ['玩', '陪', '遊戲', '逗貓', '逗貓棒', '雷射'], text: '喵？要玩嗎？...（盯著你的手）' },
  // 摸 / 抱 / 撸
  { keywords: ['摸', '抱', '撸', '擼', '揉'], text: '誰准你隨便摸我尾巴的？要摸只能摸頭，這是最後一次警告喔！（回頭含住你的手）', personalities: ['傲嬌', '兇猛'] },
  { keywords: ['摸', '抱', '撸', '擼', '揉'], text: '我感覺你今天心情悶悶的。我把肚皮借你摸一下，心情會變好喔。（翻過身露肚子）', personalities: ['貼心'] },
  { keywords: ['摸', '抱', '撸', '擼', '揉'], text: '......。（把下巴擱在你手上）' },
  { keywords: ['摸', '抱', '撸', '擼', '揉'], text: '...（用頭蹭了蹭你的手）' },
  // 睡覺 / 睡 / 睏
  { keywords: ['睡覺', '睡', '睏', '想睡', '晚安'], text: '喵...你吵到我了，我剛剛在睡覺。（打哈欠）' },
  { keywords: ['睡覺', '睡', '睏', '想睡', '晚安'], text: '世界就是這樣，吵吵鬧鬧的也沒意思。你忙你的，我睡我的。（蜷縮身體）', personalities: ['老成'] },
  { keywords: ['睡覺', '睡', '睏', '想睡', '晚安'], text: '......。（瞇起眼睛，發出呼嚕聲）' },
  // 乖 / 聽話
  { keywords: ['乖', '聽話', '好乖'], text: '我才沒有在聽你的話，只是剛好想做這件事而已。（甩尾巴）', personalities: ['傲嬌'] },
  { keywords: ['乖', '聽話', '好乖'], text: '喵～（瞇起眼睛）' },
  // 愛你 / 喜歡 / 想
  { keywords: ['愛你', '喜歡', '想你', '想我'], text: '離我遠一點啦。算了，你還是過來這邊坐著吧，我只是怕你一個人寂寞。（把頭擱在你腳上）', personalities: ['傲嬌', '黏人'] },
  { keywords: ['愛你', '喜歡', '想你', '想我'], text: '哇！我也最喜歡你了！你是世界上最棒的人！（蹭你的腿）', personalities: ['熱情'] },
  { keywords: ['愛你', '喜歡', '想你', '想我'], text: '......。（一直跟著你）', personalities: ['黏人', '安靜'] },
  { keywords: ['愛你', '喜歡', '想你', '想我'], text: '嗯。（用頭頂你的手）' },
  // 幹嘛 / 在做什麼
  { keywords: ['幹嘛', '在做什麼', '在幹嘛', '在做啥'], text: '我也沒幹嘛，就只是待著而已。（瞇眼睛）' },
  { keywords: ['幹嘛', '在做什麼', '在幹嘛', '在做啥'], text: '那個會動的東西是什麼？（盯著螢幕）' },
  { keywords: ['幹嘛', '在做什麼', '在幹嘛', '在做啥'], text: '......。（抬頭看你一眼，繼續舔爪子）' },
  // 早安 / 早上
  { keywords: ['早安', '早上', '早'], text: '早安，你醒了。' },
  { keywords: ['早安', '早上', '早'], text: '早上好，今天天氣如何？' },
  { keywords: ['早安', '早上', '早'], text: '你終於起床了，我餓了。' },
  // 晚安
  { keywords: ['晚安'], text: '都這麼晚了，早點睡。（打哈欠）' },
  { keywords: ['晚安'], text: '......。（瞇起眼睛）' },
  // 謝謝
  { keywords: ['謝謝', '感謝'], text: '嗯。（甩了甩尾巴）' },
  { keywords: ['謝謝', '感謝'], text: '不用謝，你記得準時放飯就好。（瞇眼睛）', personalities: ['吃貨'] },
  // 對不起 / 抱歉
  { keywords: ['對不起', '抱歉', '不好意思'], text: '......。（走過來蹭你）' },
  { keywords: ['對不起', '抱歉', '不好意思'], text: '嘖，下次注意一點。（甩尾巴）', personalities: ['傲嬌'] },
  // 怕 / 嚇
  { keywords: ['怕', '嚇', '可怕'], text: '剛才外面有奇怪的砰砰聲，嚇死我了。我可以躲在你旁邊嗎？（縮起脖子）', personalities: ['膽小'] },
  { keywords: ['怕', '嚇', '可怕'], text: '門外有奇怪的腳步聲。你先去看看，我在這裡幫你殿後。（壓低身體）', personalities: ['謹慎', '膽小'] },
  // 累 / 辛苦
  { keywords: ['累', '辛苦', '好累'], text: '你今天好像有點累？我陪你坐著就好，哪都不去。（趴在你膝蓋）', personalities: ['貼心'] },
  { keywords: ['累', '辛苦', '好累'], text: '嘖，看你一直打冷顫，毯子借你一半吧。別感冒了。（靠在你腿邊）', personalities: ['冷淡', '貼心'] },
  { keywords: ['累', '辛苦', '好累'], text: '......。（把下巴擱在你手上）' },
  // 地盤 / 我的
  { keywords: ['地盤', '我的', '不准'], text: '那是我的地盤。你可以在這，但別碰那個位置。（哈氣）', personalities: ['兇猛'] },
  { keywords: ['地盤', '我的', '不准'], text: '除了我之外，誰都不准欺負你。（蹭你的手）', personalities: ['兇猛', '貼心'] },
  // 通用：短句或無關鍵字時可從較中性的罐頭隨機（這裡不依關鍵字，只給 AI 處理前用的 fallback）
];

/**
 * 依使用者輸入與貓咪個性，回傳匹配的罐頭訊息；無匹配則回傳 null（改走 AI）。
 */
export function getKeywordCannedReply(
  userMessage: string,
  personality?: string[] | null
): string | null {
  const trimmed = userMessage.trim();
  if (!trimmed) return null;

  const matched: KeywordCanned[] = [];
  for (const entry of KEYWORD_CANNED) {
    const hasKeyword = entry.keywords.some((kw) => trimmed.includes(kw));
    if (!hasKeyword) continue;
    if (personality?.length && entry.personalities?.length) {
      const catSet = new Set(personality);
      const allMatch = entry.personalities.every((p) => catSet.has(p));
      if (!allMatch) continue;
    }
    matched.push(entry);
  }

  if (matched.length === 0) return null;
  const chosen = matched[Math.floor(Math.random() * matched.length)];
  return chosen.text;
}
