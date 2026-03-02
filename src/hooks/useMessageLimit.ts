/**
 * SDD 6.1 免費版：每日 10 則訊息
 * 隔天台灣時間 00:00 重置
 */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const FREE_DAILY_LIMIT = 10;
const TAIWAN_TZ = 'Asia/Taipei';

function getTodayTaiwan(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TAIWAN_TZ });
}

export function useMessageLimit(userId: string | undefined, plan: string) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const isPaid = plan === 'paid';
  const canSend = isPaid || count < FREE_DAILY_LIMIT;
  const remaining = isPaid ? Infinity : Math.max(0, FREE_DAILY_LIMIT - count);

  useEffect(() => {
    if (!userId) {
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
  }, [userId]);

  const incrementCount = async (): Promise<boolean> => {
    if (!userId) return false;
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
    limit: isPaid ? null : FREE_DAILY_LIMIT,
    incrementCount,
    loading,
  };
}
