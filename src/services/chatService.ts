/**
 * SDD 2.6 API 呼叫規格
 * 透過 Supabase Edge Function 代理；systemPrompt 由伺服器組裝，避免用戶端快取舊 JS 導致邏輯錯誤。
 */
import { supabase } from '../lib/supabase';
import type { Cat } from '../types/database';
import type { Message } from '../types/database';

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`
  : '';

export async function sendChatMessage(
  cat: Cat,
  userMessage: string,
  recentMessages: Message[],
  memorySummary: string | null
): Promise<string> {
  if (!EDGE_FUNCTION_URL) {
    return getMockResponse();
  }

  const history = recentMessages.slice(-10).map((m) => ({
    role: m.role as 'user' | 'model',
    content: m.content,
  }));

  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;

  if (!token) {
    throw new Error('請先登入');
  }

  const res = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: userMessage,
      cat: {
        cat_name: cat.cat_name,
        breed: cat.breed,
        age: cat.age,
        personality: cat.personality ?? [],
        preferences: cat.preferences,
        dislikes: cat.dislikes,
        habits: cat.habits,
        self_ref: cat.self_ref,
      },
      memorySummary: memorySummary ?? null,
      history: history.map((h) => ({
        role: h.role === 'model' ? 'assistant' : h.role,
        content: h.content,
      })),
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || json.detail || 'AI 服務錯誤');
  }

  return json.reply || '';
}

export function getMockResponse(): string {
  const lines = [
    '喵～你在叫我嗎？',
    '咪嗚～今天天氣真好，適合曬太陽喵～',
    '嗯？你想聊什麼？本喵聽著呢～',
    '喵！這個問題嘛...讓本喵想想...',
    '呼嚕呼嚕～你對我真好～',
    '喵嗚！我餓了，有罐罐嗎？',
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}
