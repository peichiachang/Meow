/**
 * SDD 6.1 免費版：每日訊息上限由 config 決定
 * 隔天台灣時間 00:00 重置；limit 為 null 時不限次數
 */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DAILY_MESSAGE_LIMIT } from '../config';

const TAIWAN_TZ = 'Asia/Taipei';

function getTodayTaiwan(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TAIWAN_TZ });
}

export function useMessageLimit(userId: string | undefined, plan: string) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const limit = DAILY_MESSAGE_LIMIT;
  const isPaid = plan === 'paid';
  const limitDisabled = limit == null;
  const canSend = limitDisabled || isPaid || count < limit;
  const remaining =
    limitDisabled || isPaid ? Infinity : Math.max(0, limit - count);

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
    limit: limitDisabled || isPaid ? null : limit,
    incrementCount,
    loading,
  };
}
