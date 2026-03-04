/**
 * SDD 6.1 免費版：每日訊息上限由 config 決定
 * 隔天台灣時間 00:00 重置；limit 為 null 時不限次數
 */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DAILY_MESSAGE_LIMIT, EXEMPT_USER_IDS } from '../config';

const TAIWAN_TZ = 'Asia/Taipei';

function getTodayTaiwan(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TAIWAN_TZ });
}

export function useMessageLimit(userId: string | undefined, _plan: string) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // 檢查是否為例外帳號（不受限制）
  const isExempt = userId ? EXEMPT_USER_IDS.includes(userId) : false;

  // 每個帳號每天限定 20 則訊息（貓咪加總計算），例外帳號不受限制
  const limit = DAILY_MESSAGE_LIMIT ?? 20;
  const limitDisabled = limit == null || isExempt;
  const canSend = limitDisabled || count < limit;
  const remaining = limitDisabled ? Infinity : Math.max(0, limit - count);

  useEffect(() => {
    if (!userId || limitDisabled) {
      setCount(0);
      setLoading(false);
      return;
    }

    async function fetchCount() {
      const today = getTodayTaiwan();
      const { data, error } = await supabase
        .from('daily_message_counts')
        .select('count')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[useMessageLimit]', error);
      }
      setCount(data?.count ?? 0);
      setLoading(false);
    }

    fetchCount();
  }, [userId, limitDisabled]);

  const incrementCount = async (): Promise<boolean> => {
    if (!userId || limitDisabled) return true;
    const today = getTodayTaiwan();

    const { data: newCount, error } = await supabase.rpc(
      'increment_daily_message_count',
      { p_user_id: userId, p_date: today }
    );

    if (error) {
      console.error('[useMessageLimit] increment failed:', error);
      return false;
    }

    setCount(newCount ?? count + 1);
    return true;
  };

  return {
    count,
    canSend,
    remaining,
    limit: limitDisabled ? null : limit,
    incrementCount,
    loading,
  };
}
