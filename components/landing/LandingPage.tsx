'use client';

import { ShoppingBag, Store, Zap, Eye, Shield, Sparkles } from 'lucide-react';
import GhostLogo from '@/components/brand/GhostLogo';

export default function LandingPage({ onNavigate }: { onNavigate: (view: 'login' | 'signup') => void }) {
  return (
    <div className="app-shell">
      <div
        className="flex-1 flex flex-col overflow-y-auto"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Hero */}
        <div className="text-center px-6 pt-14 pb-8 animate-slide-up">
          <div className="ghost-logo-wrap w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-ghost-float">
            <GhostLogo size={64} />
          </div>
          <h1
            className="text-5xl font-extrabold text-text mb-3 tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            badirty
          </h1>
          <p className="text-text-2 text-base font-semibold leading-relaxed max-w-xs mx-auto">
            Enchères intimes en direct.
            <br />
            <span className="text-buyer">Social.</span>{' '}
            <span className="text-seller">Addictif.</span>
          </p>
        </div>

        {/* How it works */}
        <div className="px-4 mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <p className="text-xs text-text-3 uppercase tracking-widest font-bold text-center mb-5">
            Comment ça marche
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Eye, label: 'Explore', sub: 'Les enchères live', color: 'bg-buyer/10 text-buyer' },
              { icon: Zap, label: 'Enchéris', sub: 'En un clic', color: 'bg-seller/10 text-seller' },
              { icon: Shield, label: 'Reçois', sub: 'Paiement sécurisé', color: 'bg-live/10 text-live' },
            ].map(({ icon: Icon, label, sub, color }) => (
              <div key={label} className="ui-card p-4 text-center">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mx-auto mb-2`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="font-bold text-sm text-text">{label}</p>
                <p className="text-[11px] text-text-3 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Feature cards */}
        <div className="px-4 space-y-3 mb-10 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="ui-card p-5 flex gap-4 items-start">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-buyer to-buyer-light flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-text mb-0.5">Acheteur</h3>
              <p className="text-sm text-text-2 leading-relaxed">
                Parcours les enchères en live, enchéris de façon anonyme et remporte des items exclusifs.
              </p>
            </div>
          </div>

          <div className="ui-card p-5 flex gap-4 items-start">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-seller to-[#8ed9cc] flex items-center justify-center shrink-0">
              <Store className="w-6 h-6 text-[#0f2a24]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-text mb-0.5">Vendeur</h3>
              <p className="text-sm text-text-2 leading-relaxed">
                Lance tes propres enchères en quelques secondes. Fixe ton prix de départ et regarde les offres affluer.
              </p>
            </div>
          </div>
        </div>

        {/* Trust / Stats */}
        <div className="px-4 mb-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="ui-card p-4 flex items-center justify-center gap-1 text-center">
            <Sparkles className="w-4 h-4 text-buyer" />
            <p className="text-xs text-text-2 font-semibold">
              Paiements sécurisés via <span className="text-text font-bold">Stripe</span> · Retraits simples · <span className="text-live font-bold">100% anonyme</span>
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto px-4 pb-8 flex flex-col gap-3 animate-slide-up" style={{ animationDelay: '0.35s' }}>
          <button
            onClick={() => onNavigate('signup')}
            className="btn-buyer w-full py-4 text-base flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Créer un compte gratuit
          </button>
          <button
            onClick={() => onNavigate('login')}
            className="w-full py-4 text-base font-bold text-text-2 bg-white/70 border border-border rounded-2xl hover:bg-card-muted transition-colors"
          >
            J&apos;ai déjà un compte
          </button>
          <p className="text-center text-[11px] text-text-3 mt-1">
            Acheteur ou vendeur — un seul compte suffit
          </p>
        </div>
      </div>
    </div>
  );
}
