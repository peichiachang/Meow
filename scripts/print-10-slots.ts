/**
 * 用 slot 抽換產出 10 句範例（不重複基底、不重複句子）
 * 執行：npx tsx scripts/print-10-slots.ts
 */
import { substituteCannedSlots } from '../src/data/cannedSlotTaxonomy';
import { CANNED_MESSAGES } from '../src/data/cannedMessages';

// 10 則不同罐頭（分散、且多含 subject/address/action）
const baseIndices = [0, 2, 11, 15, 26, 34, 45, 58, 72, 88];

console.log('=== 10 句 slot 抽換範例（不重複）===\n');

const seen = new Set<string>();
let n = 0;
for (const idx of baseIndices) {
  const base = CANNED_MESSAGES[idx].text;
  let line = substituteCannedSlots(base);
  // 若抽換後與前面重複，再抽一次（最多試 5 次）
  let tries = 0;
  while (seen.has(line) && tries < 5) {
    line = substituteCannedSlots(base);
    tries++;
  }
  seen.add(line);
  n++;
  console.log(`${n}. ${line}`);
  console.log('');
}
