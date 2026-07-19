'use client';

import { useEffect, useState } from 'react';
import { ShoppingBag, Store, Zap, Eye, Shield, Sparkles, Flame } from 'lucide-react';
import GhostLogo from '@/components/brand/GhostLogo';
import type { Auction } from '@/lib/types';
import { fetchLiveAuctions } from '@/lib/db';
import { centsToEuros } from '@/lib/format';
import { useCountdown } from '@/hooks/useCountdown';

function TeaserCard({ item, onTap }: { item: Auction; onTap: () => void }) {
  const countdown = useCountdown(item.ends_at);
  return (
    <button type="button" onClick={onTap} className="teaser-card ui-card overflow-hidden text-left w-full">
      <div className={`relative h-36 bg-gradient-to-br ${item.image_color}`}>
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <span className="live-pill absolute top-2 right-2 text-[10px] py-0.5 px-2">
          <Flame className="w-2.5 h-2.5 inline" /> LIVE
        </span>
        <div className="absolute bottom-2 left-3 right-3">
          <p className="text-white font-bold text-sm truncate">{item.title}</p>
          <div className="flex justify-between items-center mt-1">
            <p className="text-accent font-extrabold text-sm">{centsToEuros(item.current_price_cents)} €</p>
            <p className="text-white/70 text-[10px] font-mono">{countdown}</p>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function LandingPage({ onNavigate }: { onNavigate: (view: 'login' | 'signup') => void }) {
  const [livePreview, setLivePreview] = useState<Auction[]>([]);

  useEffect(() => {
    fetchLiveAuctions()
      .then((items) => setLivePreview(items.slice(0, 6)))
      .catch(() => setLivePreview([]));
  }, []);

  return (
    <div className="app-shell">
      <div
        className="flex-1 flex flex-col overflow-y-auto relative z-10"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="text-center px-6 pt-14 pb-6 animate-slide-up">
          <div className="ghost-logo-wrap w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-ghost-float">
            <GhostLogo size={64} />
          </div>
          <h1
            className="text-5xl font-extrabold text-text mb-3 tracking-tight leading-none"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            badirty
          </h1>
          <p className="text-text-2 text-base font-semibold leading-relaxed max-w-xs mx-auto">
            Enchères intimes en direct.
            <br />
            <span className="text-accent animate-neon">Privé.</span>{' '}
            <span className="text-pink animate-live-pulse">Addictif.</span>
          </p>
        </div>

        {livePreview.length > 0 && (
          <div className="px-4 mb-8 animate-slide-up delay-1">
            <p className="text-[10px] text-text-3 uppercase tracking-[0.12em] font-bold mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose animate-live-pulse" />
              En ce moment
            </p>
            <div className="teaser-scroll flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {livePreview.map((item) => (
                <TeaserCard key={item.id} item={item} onTap={() => onNavigate('signup')} />
              ))}
            </div>
            <p className="text-text-3 text-[11px] text-center mt-3 font-medium">
              Inscris-toi pour enchérir en un clic
            </p>
          </div>
        )}

        <div className="px-4 mb-8 animate-slide-up delay-2">
          <p className="text-[10px] text-text-3 uppercase tracking-[0.12em] font-bold text-center mb-5">
            Comment ça marche
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Eye, label: 'Explore', sub: 'Les enchères live', color: 'bg-accent/10 text-accent' },
              { icon: Zap, label: 'Enchéris', sub: 'En un clic', color: 'bg-pink/10 text-pink' },
              { icon: Shield, label: 'Reçois', sub: 'Paiement sécurisé', color: 'bg-rose/10 text-rose' },
            ].map(({ icon: Icon, label, sub, color }) => (
              <div key={label} className="bento-card p-4 text-center">
                <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mx-auto mb-2.5`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="font-bold text-sm text-text">{label}</p>
                <p className="text-[11px] text-text-3 mt-0.5 leading-tight">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 space-y-3 mb-10 animate-slide-up delay-3">
          <div className="bento-card p-5 flex gap-4 items-start">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-pink flex items-center justify-center shrink-0 shadow-lg shadow-accent/20">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-text mb-0.5">Enchéris</h3>
              <p className="text-sm text-text-2 leading-relaxed">
                Parcours les enchères en live, enchéris sous ton pseudo et remporte des items exclusifs.
              </p>
            </div>
          </div>

          <div className="bento-card p-5 flex gap-4 items-start">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink to-rose flex items-center justify-center shrink-0 shadow-lg shadow-pink/20">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-text mb-0.5">Vends</h3>
              <p className="text-sm text-text-2 leading-relaxed">
                Lance tes enchères en quelques secondes. Fixe ton prix ou un achat immédiat.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-auto px-4 pb-8 flex flex-col gap-3 animate-slide-up delay-4">
          <button
            onClick={() => onNavigate('signup')}
            className="btn-accent w-full py-4 text-base flex items-center justify-center gap-2 shadow-xl shadow-accent/20"
          >
            <Sparkles className="w-4 h-4" />
            Créer un compte gratuit
          </button>
          <button
            onClick={() => onNavigate('login')}
            className="btn-soft w-full py-4 text-base"
          >
            J&apos;ai déjà un compte
          </button>
          <p className="text-center text-[11px] text-text-3 mt-1">
            Paiements sécurisés ·{' '}
            <a href="/mentions-legales" className="text-accent hover:underline">Mentions</a>
            {' · '}
            <a href="/terms" className="text-accent hover:underline">CGU</a>
            {' · '}
            <a href="/privacy" className="text-accent hover:underline">Confidentialité</a>
          </p>
        </div>
      </div>
    </div>
  );
}