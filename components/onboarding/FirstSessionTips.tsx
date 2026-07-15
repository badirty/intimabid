'use client';

import { useState } from 'react';
import { X, Wallet, Plus, Flame } from 'lucide-react';

const KEY = 'badirty_tips_seen';

export default function FirstSessionTips({ onDismiss }: { onDismiss?: () => void }) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem(KEY);
  });

  if (!visible) return null;

  const close = () => {
    localStorage.setItem(KEY, '1');
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div className="mx-4 mb-3 ui-card p-4 border-accent/25 relative animate-slide-up">
      <button type="button" onClick={close} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
        <X className="w-3.5 h-3.5" />
      </button>
      <p className="text-xs font-bold text-accent mb-2">Premiers pas sur badirty</p>
      <ul className="text-[11px] text-text-2 space-y-1.5">
        <li className="flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-rose shrink-0" /> Enchéris sur les lives</li>
        <li className="flex items-center gap-2"><Wallet className="w-3.5 h-3.5 text-accent shrink-0" /> Recharge ton portefeuille en haut à droite</li>
        <li className="flex items-center gap-2"><Plus className="w-3.5 h-3.5 text-pink shrink-0" /> Vends avec le bouton +</li>
      </ul>
    </div>
  );
}