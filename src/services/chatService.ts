/**
 * SDD 2.6 API 呼叫規格
 * 透過 Supabase Edge Function 代理；systemPrompt 由伺服器組裝，避免用戶端快取舊 JS 導致邏輯錯誤。
 */
import type { Cat } from '../types/database';
import type { Message } from '../types/database';
import { supabase } from '../lib/supabase';
import { calculateHunger } from '../lib/stateCalculator';

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

  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error('缺少 VITE_SUPABASE_ANON_KEY');
  }

  // 🔒 安全性：取得使用者 session token 用於認證
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('未登入');
  }

  // 減少歷史訊息數量以降低超時風險：從 10 條減少到 5 條（最近 5 輪對話）
  const history = recentMessages.slice(-5).map((m) => ({
    role: m.role as 'user' | 'model',
    content: m.content,
  }));

  // SDD v2.1: 計算 hunger（距離上次開啟 App 的時間）
  const hunger = calculateHunger();

    const body = {
      message: userMessage,
      cat: {
        id: cat.id, // 新增：用於計算對話輪數
        cat_name: cat.cat_name,
        age: cat.age,
        personality: cat.personality ?? [],
        preferences: cat.preferences,
        dislikes: cat.dislikes,
        habits: cat.habits,
        self_ref: cat.self_ref,
        owner_ref: (cat as any).owner_ref || null,
        status: cat.status || 'Living',
        mood: null, // 由後端計算
        energy: null, // 由後端計算
        hunger: hunger, // 前端計算
      },
    memorySummary: memorySummary ?? null,
    history: history.map((h) => ({
      role: h.role === 'model' ? 'assistant' : h.role,
      content: h.content,
    })),
  };

  const doFetch = async () =>
    fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify(body),
    });

  const parseResponse = async (res: Response) => {
    const raw = await res.text();
    let json: any = null;
    try {
      json = raw ? JSON.parse(raw) : null;
    } catch {
      json = null;
    }
    return { raw, json };
  };

  let res = await doFetch();
  let { raw, json } = await parseResponse(res);

  // 502/503（AI 高負載）時重試一次，間隔 2 秒
  if (res.status === 502 || res.status === 503) {
    await new Promise((r) => setTimeout(r, 2000));
    res = await doFetch();
    const parsed = await parseResponse(res);
    raw = parsed.raw;
    json = parsed.json;
  }

  if (!res.ok) {
    console.error('[chatService] chat error', res.status, raw);
    if (res.status === 401) {
      throw new Error('登入已過期，請重新登出再登入');
    }
    // SDD v3.2：API 異常時根據狀態顯示不同訊息
    if (res.status === 502 || res.status === 503) {
      const selfRef = cat.self_ref || '我';
      const status = cat.status || 'Living';
      const errorMessage = status === 'Angel'
        ? `${selfRef}去雲端抓蝴蝶了，等等再回來陪你喵... (連線異常)`
        : `${selfRef}現在午睡中，暫時不想理你喵... (連線異常)`;
      throw new Error(errorMessage);
    }
    throw new Error(json?.error || json?.detail || `AI 服務錯誤 (${res.status})`);
  }

  return json?.reply || '';
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
