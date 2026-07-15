'use client';

import { useState } from 'react';
import { ShoppingBag, Store, Sparkles, ArrowLeftRight } from 'lucide-react';
import type { PreferredMode } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import GhostLogo from '@/components/brand/GhostLogo';

export default function OnboardingWelcome({
  userEmail,
  onComplete,
}: {
  userEmail?: string;
  onComplete: (mode: PreferredMode) => void;
}) {
  const [loading, setLoading] = useState<PreferredMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const name = userEmail?.split('@')[0] ?? 'toi';

  const finish = async (mode: PreferredMode) => {
    setLoading(mode);
    const { error: e } = await supabase.auth.updateUser({
      data: { onboarding_completed: true, preferred_mode: mode, role: mode === 'seller' ? 'seller' : 'buyer' },
    });
    if (e) { setError(e.message); setLoading(null); return; }
    onComplete(mode);
  };

  return (
    <div className="app-shell">
    <div
      className="flex items-center justify-center p-6 flex-1 min-h-dvh"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="w-full animate-slide-up">
        <div className="text-center mb-8">
          <div className="ghost-logo-wrap w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-ghost-float">
            <GhostLogo size={40} />
          </div>
          <h1 className="text-2xl font-extrabold text-text" style={{ fontFamily: 'var(--font-display)' }}>
            Bienvenue {name}
          </h1>
          <p className="text-text-2 text-sm mt-2 leading-relaxed">
            Tu peux <strong>acheter et vendre</strong> sur badirty.
            <br />Par quelle interface veux-tu commencer ?
          </p>
        </div>

        <div className="space-y-3">
          <Option
            icon={<ShoppingBag className="w-6 h-6" />}
            title="Interface Acheteur"
            sub="Enchères live, favoris, offres"
            color="buyer"
            onClick={() => finish('buyer')}
            loading={loading === 'buyer'}
            disabled={loading !== null}
          />
          <Option
            icon={<Store className="w-6 h-6" />}
            title="Interface Vendeur"
            sub="Dashboard, créer enchères, solde"
            color="seller"
            onClick={() => finish('seller')}
            loading={loading === 'seller'}
            disabled={loading !== null}
          />
          <Option
            icon={<ArrowLeftRight className="w-6 h-6" />}
            title="Les deux"
            sub="Bascule entre les deux à tout moment"
            color="header"
            highlighted
            onClick={() => finish('both')}
            loading={loading === 'both'}
            disabled={loading !== null}
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center mt-4">{error}</p>}
        <p className="text-center text-[11px] text-text-3 mt-6">Tu pourras acheter et vendre dans les deux cas.</p>
      </div>
    </div>
    </div>
  );
}

function Option({ icon, title, sub, color, onClick, loading, disabled, highlighted }: {
  icon: React.ReactNode; title: string; sub: string; color: string;
  onClick: () => void; loading: boolean; disabled: boolean; highlighted?: boolean;
}) {
  const bg = color === 'buyer' ? 'bg-buyer' : color === 'seller' ? 'bg-seller' : 'bg-header';
  return (
    <button onClick={onClick} disabled={disabled}
      className={`ui-card w-full p-4 text-left flex items-center gap-4 disabled:opacity-50 transition-transform hover:scale-[1.01] ${
        highlighted ? 'ring-2 ring-buyer/30' : ''
      }`}>
      <div className={`w-12 h-12 rounded-xl ${bg} text-white flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-bold text-text">{title}</p>
        <p className="text-text-2 text-xs mt-0.5">{sub}</p>
      </div>
      <span className="text-text-3 text-sm">{loading ? '...' : '→'}</span>
    </button>
  );
}