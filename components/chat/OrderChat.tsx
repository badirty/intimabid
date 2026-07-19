'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import type { MessageCode, Order, OrderMessage } from '@/lib/types';
import {
  fetchOrderMessages, getAvailableMessageCodes, getMessageLabel, sendOrderMessage,
} from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function OrderChat({
  order,
  userId,
}: {
  order: Order;
  userId: string;
}) {
  const role: 'buyer' | 'seller' = order.buyer_id === userId ? 'buyer' : 'seller';
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const availableCodes = getAvailableMessageCodes(role, order.status);

  const load = useCallback(async () => {
    try {
      const msgs = await fetchOrderMessages(order.id);
      setMessages(msgs);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [order.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(); }, [load]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`order_messages:${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages',
          filter: `order_id=eq.${order.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (payload.new as OrderMessage).id)) return prev;
            return [...prev, payload.new as OrderMessage];
          });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [order.id]);

  const send = async (code: MessageCode) => {
    setSending(true);
    setError(null);
    try {
      await sendOrderMessage(order.id, code);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[60vh] min-h-[380px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 shrink-0">
        <MessageCircle className="w-4 h-4 text-accent" />
        <span className="font-bold text-sm text-text">
          Messages
        </span>
        <span className="text-[10px] text-text-3 ml-auto">
          {order.counterparty_name ? `avec ${order.counterparty_name}` : ''}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading && (
          <p className="text-text-3 text-sm text-center py-8">Chargement...</p>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center py-8">
            <MessageCircle className="w-10 h-10 text-text-3 mx-auto mb-2 opacity-40" />
            <p className="text-text-3 text-sm">Aucun message</p>
            <p className="text-text-3 text-xs mt-1">
              Utilise les réponses rapides ci-dessous pour communiquer
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender_id === userId;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMine
                    ? 'bg-accent/20 text-text rounded-br-md'
                    : 'bg-white/10 text-text rounded-bl-md'
                }`}
              >
                <p className="leading-relaxed">{getMessageLabel(msg.message_code)}</p>
                <p className="text-[10px] text-text-3 mt-1 text-right">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: fr })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <p className="text-rose text-xs px-4 py-1 text-center">{error}</p>
      )}

      {/* Quick reply chips */}
      <div className="shrink-0 border-t border-white/10 px-3 py-3">
        <p className="text-[10px] text-text-3 mb-2 text-center uppercase tracking-wider font-bold">
          Réponses rapides
        </p>
        <div className="flex flex-wrap gap-2">
          {availableCodes.map((code) => (
            <button
              key={code}
              type="button"
              disabled={sending}
              onClick={() => send(code)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-xs font-medium text-text disabled:opacity-40"
            >
              <Send className="w-3 h-3 text-accent" />
              {getMessageLabel(code)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
