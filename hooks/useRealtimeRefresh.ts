'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/** Rafraîchit le callback quand enchères ou offres changent (Supabase Realtime). */
export function useRealtimeRefresh(onRefresh: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('badirty-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, () => onRefresh())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' }, () => onRefresh())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onRefresh, enabled]);
}