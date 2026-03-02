import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Cat, CatInsert } from '../types/database';

export function useCats(userId: string | undefined) {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setCats([]);
      setLoading(false);
      return;
    }

    async function fetchCats() {
      const { data, error } = await supabase
        .from('cats')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[useCats]', error);
        setCats([]);
      } else {
        setCats(data || []);
      }
      setLoading(false);
    }

    fetchCats();
  }, [userId]);

  const createCat = async (insert: Omit<CatInsert, 'user_id'>) => {
    if (!userId) throw new Error('未登入');
    const { data, error } = await supabase
      .from('cats')
      .insert({ ...insert, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    setCats((prev) => [...prev, data]);
    return data;
  };

  const updateCat = async (id: string, updates: Partial<Cat>) => {
    const { data, error } = await supabase
      .from('cats')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setCats((prev) => prev.map((c) => (c.id === id ? data : c)));
    return data;
  };

  const deleteCat = async (id: string) => {
    const { error } = await supabase.from('cats').delete().eq('id', id);
    if (error) throw error;
    setCats((prev) => prev.filter((c) => c.id !== id));
  };

  return {
    cats,
    loading,
    createCat,
    updateCat,
    deleteCat,
  };
}
