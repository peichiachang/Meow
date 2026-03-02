import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Message } from '../types/database';

const RECENT_LIMIT = 10; // SDD: 最近 10 則完整對話

export function useMessages(catId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!catId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    async function fetchMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('cat_id', catId)
        .order('created_at', { ascending: true })
        .limit(100); // 單次載入上限

      if (error) {
        console.error('[useMessages]', error);
        setMessages([]);
      } else {
        setMessages(data || []);
      }
      setLoading(false);
    }

    fetchMessages();
  }, [catId]);

  const addMessage = async (
    role: 'user' | 'assistant',
    content: string
  ): Promise<Message> => {
    if (!catId) throw new Error('未選擇貓咪');
    const { data, error } = await supabase
      .from('messages')
      .insert({ cat_id: catId, role, content })
      .select()
      .single();
    if (error) throw error;
    setMessages((prev) => [...prev, data]);
    return data;
  };

  const getRecentForContext = () =>
    messages.slice(-RECENT_LIMIT);

  return {
    messages,
    loading,
    addMessage,
    getRecentForContext,
  };
}
