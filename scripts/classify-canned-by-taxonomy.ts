/**
 * 依指定分類法，對 300 則罐頭句型進行分類統計
 * 輸出：各分類詞彙的出現次數、每則罐頭標註到的分類
 *
 * 執行：npm run classify:canned
 */
import fs from 'node:fs';
import path from 'node:path';
import { CANNED_MESSAGES } from '../src/data/cannedMessages';

const TAXONOMY = {
  subject: ['本喵', '我', '本大爺', '主子'],
  address: ['奴才', '鏟屎官', '這隻人類', '餵飯的'],
  state: ['肚子餓扁了', '電力剩 1%', '看透貓生', '心情極好', '覺得你很煩'],
  verb: ['開罐頭', '抓沙發', '踩肚子', '哈氣', '蹭腿', '理毛'],
  ending: ['懂了嗎？', '不准賴床！', '真拿你沒辦法', '喵嗚！'],
  action: ['(甩尾巴)', '(發出呼嚕聲)', '(瞇眼睛)', '(舔爪子)'],
} as const;

type Category = keyof typeof TAXONOMY;

// action 括號可能為全形或半形，在 findInText 內一併比對

function findInText(text: string, category: Category, value: string): boolean {
  if (category === 'action') {
    const idx = TAXONOMY.action.indexOf(value as (typeof TAXONOMY.action)[number]);
    if (idx === -1) return false;
    const half = value;
    const full = half.replace('(', '（').replace(')', '）');
    return text.includes(half) || text.includes(full);
  }
  return text.includes(value);
}

interface MessageClassification {
  index: number;
  text: string;
  personalities: string[];
  subject: string[];
  address: string[];
  state: string[];
  verb: string[];
  ending: string[];
  action: string[];
}

const summary: Record<Category, Record<string, number>> = {
  subject: {},
  address: {},
  state: {},
  verb: {},
  ending: {},
  action: {},
};

for (const cat of Object.keys(TAXONOMY) as Category[]) {
  for (const v of TAXONOMY[cat]) {
    summary[cat][v] = 0;
  }
}

const messages: MessageClassification[] = [];

CANNED_MESSAGES.forEach((msg, index) => {
  const row: MessageClassification = {
    index,
    text: msg.text,
    personalities: msg.personalities,
    subject: [],
    address: [],
    state: [],
    verb: [],
    ending: [],
    action: [],
  };

  for (const cat of Object.keys(TAXONOMY) as Category[]) {
    for (const value of TAXONOMY[cat]) {
      if (findInText(msg.text, cat, value)) {
        row[cat].push(value);
        summary[cat][value]++;
      }
    }
  }
  messages.push(row);
});

// 寫出 JSON 結果
const output = {
  taxonomy: TAXONOMY,
  summary,
  totalMessages: CANNED_MESSAGES.length,
  messages: messages.map(({ index, text, personalities, subject, address, state, verb, ending, action }) => ({
    index,
    text: text.slice(0, 80) + (text.length > 80 ? '…' : ''),
    personalities,
    subject,
    address,
    state,
    verb,
    ending,
    action,
  })),
};

const outPath = path.join(process.cwd(), 'docs', 'canned-taxonomy-classification.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');

console.log('=== 300 則罐頭句型分類結果 ===\n');
console.log('依分類統計（出現次數）：');
for (const cat of Object.keys(TAXONOMY) as Category[]) {
  console.log(`\n【${cat}】`);
  for (const [value, count] of Object.entries(summary[cat])) {
    console.log(`  ${value}: ${count}`);
  }
}
console.log(`\n完整明細已寫入: ${outPath}`);
