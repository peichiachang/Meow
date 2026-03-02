/**
 * SDD 2.5 記憶摘要 - 非同步觸發
 * 每 10 則對話後由前端觸發，不等待回應
 */
import { supabase } from '../lib/supabase';

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize-memory`
  : '';

export async function triggerMemorySummarize(catId: string): Promise<void> {
  if (!EDGE_FUNCTION_URL) return;

  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;
  if (!token) return;

  // 非同步呼叫，不 await
  fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ catId }),
  }).catch((err) => console.warn('[memoryService] summarize trigger failed:', err));
}
