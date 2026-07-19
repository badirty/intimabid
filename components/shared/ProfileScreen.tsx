'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { LogOut, Wallet, Store, Pencil, Check, X, Package, Mail, Shield } from 'lucide-react';
import { centsToEuros } from '@/lib/format';
import { fetchProfile, fetchSellerStats, fetchUserStats, updateDisplayName, updateProfileSettings } from '@/lib/db';
import { resolveProfileFromUser } from '@/lib/profile';
import type { SellerSearchResult } from '@/lib/types';
import UserAvatar from '@/components/brand/UserAvatar';
import { XIcon } from '@/components/icons';

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
  const [bio, setBio] = useState('');
  const [bioPublic, setBioPublic] = useState(false);
  const [xUsername, setXUsername] = useState('');
  const [xPublic, setXPublic] = useState(false);
  const [stats, setStats] = useState({ bids_count: 0, sales_count: 0, balance_cents: 0 });
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftBio, setDraftBio] = useState('');
  const [draftXUsername, setDraftXUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const displayName = profileName ?? oauth.display_name;

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((data) => setIsAdmin(!!data.isAdmin))
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    fetchProfile(userId).then((p) => {
      if (p?.display_name) setProfileName(p.display_name);
      if (p?.avatar_url) setAvatarUrl(p.avatar_url);
      else if (oauth.avatar_url) setAvatarUrl(oauth.avatar_url);
      setBio(p?.bio ?? oauth.bio ?? '');
      setBioPublic(p?.bio_public ?? false);
      setXUsername(p?.x_username ?? oauth.x_username ?? '');
      setXPublic(p?.x_public ?? false);
    }).catch(() => {});
  }, [userId, oauth.avatar_url, oauth.bio, oauth.x_username]);

  useEffect(() => {
    fetchUserStats(userId).then(setStats);
  }, [userId, walletVersion]);

  const saveProfile = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateDisplayName(userId, draftName);
      await updateProfileSettings(userId, { bio: draftBio, x_username: draftXUsername });
      setProfileName(draftName.trim());
      setBio(draftBio.trim());
      setXUsername(draftXUsername.trim().replace(/^@+/, ''));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const toggleBioPublic = async () => {
    const next = !bioPublic;
    setBioPublic(next);
    try {
      await updateProfileSettings(userId, { bio_public: next });
    } catch {
      setBioPublic(!next);
    }
  };

  const toggleXPublic = async () => {
    const next = !xPublic;
    setXPublic(next);
    try {
      await updateProfileSettings(userId, { x_public: next });
    } catch {
      setXPublic(!next);
    }
  };

  const openMyShop = async () => {
    if (!onOpenShop) return;
    const seller = await fetchSellerStats(userId, userId);
    onOpenShop(seller);
  };

  const xUrl = xUsername ? `https://x.com/${xUsername.replace(/^@+/, '')}` : null;

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
          <div className="space-y-2 text-left">
            <label className="text-[10px] uppercase tracking-wider text-text-3 font-bold">Pseudo</label>
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              maxLength={32}
              className="search-bar w-full px-4 py-2.5 text-sm"
              placeholder="Ton pseudo"
            />
            <label className="text-[10px] uppercase tracking-wider text-text-3 font-bold">Bio</label>
            <textarea
              value={draftBio}
              onChange={(e) => setDraftBio(e.target.value)}
              maxLength={160}
              rows={3}
              className="search-bar w-full px-4 py-2.5 text-sm resize-none"
              placeholder="Ta bio (importée depuis X ou Google si connecté)"
            />
            <p className="text-[10px] text-text-3">{draftBio.length}/160</p>
            <label className="text-[10px] uppercase tracking-wider text-text-3 font-bold">Nom X (Twitter)</label>
            <input
              value={draftXUsername}
              onChange={(e) => setDraftXUsername(e.target.value)}
              maxLength={30}
              className="search-bar w-full px-4 py-2.5 text-sm"
              placeholder="Ton @ sur X (importé si connecté avec X)"
            />
            {error && <p className="text-rose text-xs">{error}</p>}
            <div className="flex gap-2 justify-center pt-1">
              <button
                type="button"
                onClick={saveProfile}
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
                onClick={() => {
                  setDraftName(displayName);
                  setDraftBio(bio);
                  setDraftXUsername(xUsername);
                  setEditing(true);
                }}
                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-text-3 hover:text-accent"
                aria-label="Modifier le profil"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
            {bio ? (
              <p className="text-text-2 text-sm mt-3 leading-relaxed whitespace-pre-wrap">{bio}</p>
            ) : (
              <p className="text-text-3 text-sm mt-3">Ajoute une bio pour personnaliser ton profil</p>
            )}
            {xUrl && (
              <a
                href={xUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-sm text-text-2 hover:text-accent transition-colors"
              >
                <XIcon className="w-4 h-4" />
                <span>@{xUsername}</span>
              </a>
            )}
          </>
        )}
      </div>

      {!editing && (
        <>
        <button
          type="button"
          onClick={toggleBioPublic}
          className="ui-card w-full p-4 mb-3 flex items-center justify-between gap-3 text-left"
        >
          <div>
            <p className="font-bold text-sm">Bio visible sur ma boutique</p>
            <p className="text-text-3 text-xs mt-0.5">Les autres voient ton pseudo{bio ? ' et ta bio' : ''} — jamais ton e-mail</p>
          </div>
          <div
            className={`w-11 h-6 rounded-full shrink-0 transition-colors ${bioPublic ? 'bg-accent' : 'bg-white/10'}`}
            aria-hidden
          >
            <div
              className={`w-5 h-5 rounded-full bg-white mt-0.5 transition-transform ${bioPublic ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
            />
          </div>
        </button>

        <button
          type="button"
          onClick={toggleXPublic}
          className="ui-card w-full p-4 mb-4 flex items-center justify-between gap-3 text-left"
        >
          <div>
            <p className="font-bold text-sm">Lien X (Twitter) visible sur ma boutique</p>
            <p className="text-text-3 text-xs mt-0.5">{xUsername ? `@${xUsername} sera visible` : "Ajoute ton nom X dans l'édition du profil"}</p>
          </div>
          <div
            className={`w-11 h-6 rounded-full shrink-0 transition-colors ${xPublic ? 'bg-accent' : 'bg-white/10'}`}
            aria-hidden
          >
            <div
              className={`w-5 h-5 rounded-full bg-white mt-0.5 transition-transform ${xPublic ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
            />
          </div>
        </button>
        </>
      )}

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
          className="ui-card w-full p-4 mb-3 flex items-center gap-3 hover:border-accent/30 transition-all"
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

      {isAdmin && (
        <a
          href="/admin"
          className="ui-card w-full p-4 mb-4 flex items-center gap-3 hover:border-accent/30 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-accent" />
          </div>
          <div className="text-left flex-1">
            <p className="font-bold text-sm">Administration</p>
            <p className="text-text-3 text-xs mt-0.5">Dashboard modération</p>
          </div>
          <span className="text-text-3">→</span>
        </a>
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

      <div className="flex justify-center gap-3 text-[11px] text-text-3 mb-4 flex-wrap">
        <a href="/contact" className="hover:text-accent transition-colors flex items-center gap-1"><Mail className="w-3 h-3" /> Contact</a>
        <a href="/mentions-legales" className="hover:text-accent transition-colors">Mentions</a>
        <a href="/terms" className="hover:text-accent transition-colors">CGU</a>
        <a href="/privacy" className="hover:text-accent transition-colors">Confidentialité</a>
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