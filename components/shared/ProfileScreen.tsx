'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { LogOut, Wallet, Store, Pencil, Check, X, Package, Mail } from 'lucide-react';
import { centsToEuros } from '@/lib/format';
import { fetchProfile, fetchSellerStats, fetchUserStats, updateDisplayName } from '@/lib/db';
import { resolveProfileFromUser } from '@/lib/profile';
import type { SellerSearchResult } from '@/lib/types';
import UserAvatar from '@/components/brand/UserAvatar';

export default function ProfileScreen({
  user,
  onSignOut,
  onWallet,
  onOpenShop,
  onOpenOrders,
  walletVersion = 0,
}: {
  user: User;
  onSignOut: () => void;
  onWallet?: () => void;
  onOpenShop?: (seller: SellerSearchResult) => void;
  onOpenOrders?: () => void;
  walletVersion?: number;
}) {
  const userId = user.id;
  const oauth = resolveProfileFromUser(user);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(oauth.avatar_url);
  const [stats, setStats] = useState({ bids_count: 0, sales_count: 0, balance_cents: 0 });
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = profileName ?? oauth.display_name;

  useEffect(() => {
    fetchProfile(userId).then((p) => {
      if (p?.display_name) setProfileName(p.display_name);
      if (p?.avatar_url) setAvatarUrl(p.avatar_url);
      else if (oauth.avatar_url) setAvatarUrl(oauth.avatar_url);
    }).catch(() => {});
  }, [userId, oauth.avatar_url]);

  useEffect(() => {
    fetchUserStats(userId).then(setStats);
  }, [userId, walletVersion]);

  const saveName = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateDisplayName(userId, draftName);
      setProfileName(draftName.trim());
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const openMyShop = async () => {
    if (!onOpenShop) return;
    const seller = await fetchSellerStats(userId);
    onOpenShop(seller);
  };

  return (
    <div className="animate-slide-up px-4 py-6">
      <div className="ui-card p-6 text-center mb-4">
        <UserAvatar
          src={avatarUrl}
          name={displayName}
          size={80}
          className="mx-auto mb-4 ring-2 ring-accent/20"
        />
        {editing ? (
          <div className="space-y-2">
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              maxLength={32}
              className="search-bar w-full px-4 py-2.5 text-sm text-center"
              placeholder="Ton pseudo"
            />
            {error && <p className="text-rose text-xs">{error}</p>}
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={saveName}
                disabled={saving}
                className="btn-accent px-4 py-2 text-xs flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> {saving ? '...' : 'OK'}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setError(null); }}
                className="btn-ghost px-4 py-2 text-xs flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Annuler
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2">
              <h2 className="font-extrabold text-xl" style={{ fontFamily: 'var(--font-display)' }}>
                @{displayName}
              </h2>
              <button
                type="button"
                onClick={() => { setDraftName(displayName); setEditing(true); }}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-text-3 hover:text-accent"
                aria-label="Modifier le pseudo"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-text-2 text-sm mt-1">{user.email}</p>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => onWallet?.()}
        disabled={!onWallet}
        className="ui-card w-full p-4 mb-3 flex items-center gap-3 hover:border-accent/30 transition-all disabled:opacity-50"
      >
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-accent" />
        </div>
        <div className="text-left flex-1">
          <p className="font-bold text-sm">Portefeuille</p>
          <p className="text-accent font-extrabold">{centsToEuros(stats.balance_cents)} €</p>
        </div>
        <span className="text-text-3">→</span>
      </button>

      {onOpenOrders && (
        <button
          type="button"
          onClick={onOpenOrders}
          className="ui-card w-full p-4 mb-3 flex items-center gap-3 hover:border-accent/30 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-accent" />
          </div>
          <div className="text-left flex-1">
            <p className="font-bold text-sm">Mes commandes</p>
            <p className="text-text-3 text-xs mt-0.5">Achats et expéditions</p>
          </div>
          <span className="text-text-3">→</span>
        </button>
      )}

      {onOpenShop && (
        <button
          type="button"
          onClick={openMyShop}
          className="ui-card w-full p-4 mb-4 flex items-center gap-3 hover:border-accent/30 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-pink/10 flex items-center justify-center">
            <Store className="w-5 h-5 text-pink" />
          </div>
          <div className="text-left flex-1">
            <p className="font-bold text-sm">Ma boutique</p>
            <p className="text-text-3 text-xs mt-0.5">Voir mes enchères en ligne</p>
          </div>
          <span className="text-text-3">→</span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { v: stats.bids_count, l: 'Offres placées', color: 'text-accent' },
          { v: stats.sales_count, l: 'Ventes lancées', color: 'text-pink' },
        ].map((s) => (
          <div key={s.l} className="ui-card p-3 text-center">
            <p className={`font-extrabold text-lg ${s.color}`}>{s.v}</p>
            <p className="text-[10px] text-text-3">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-4 text-[11px] text-text-3 mb-4 flex-wrap">
        <a href="/contact" className="hover:text-accent transition-colors flex items-center gap-1"><Mail className="w-3 h-3" /> Contact</a>
        <a href="/privacy" className="hover:text-accent transition-colors">Confidentialité</a>
        <a href="/terms" className="hover:text-accent transition-colors">CGU</a>
      </div>

      <button
        onClick={onSignOut}
        className="w-full py-3 rounded-xl border border-rose/30 text-rose font-semibold text-sm flex items-center justify-center gap-2 hover:bg-rose/5 transition-colors"
      >
        <LogOut className="w-4 h-4" /> Déconnexion
      </button>
    </div>
  );
}