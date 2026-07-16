'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import GhostLogo from '@/components/brand/GhostLogo';

type Props = {
  onClose: () => void;
  onCompleted: () => void;
};

type FormState = {
  firstName: string;
  lastName: string;
  birthDate: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  iban: string;
};

const emptyForm: FormState = {
  firstName: '',
  lastName: '',
  birthDate: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postalCode: '',
  iban: '',
};

async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

/**
 * Onboarding retrait 100 % Badirty.
 * Pas de composant Stripe Embedded → l'utilisateur ne voit jamais
 * "type d'entreprise", "site web de l'entreprise", etc.
 */
export default function ConnectOnboarding({ onClose, onCompleted }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const set =
    (key: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
    };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/stripe/connect/setup-payout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: await authHeaders(),
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          birthDate: form.birthDate,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2 || undefined,
          city: form.city,
          postalCode: form.postalCode,
          iban: form.iban,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        payouts_enabled?: boolean;
        ready?: boolean;
        tos_accept_url?: string | null;
      };
      if (!res.ok) throw new Error(data.error ?? 'Échec de l’enregistrement');

      setInfo(data.message ?? 'Compte lié');
      onCompleted();

      // Express : Stripe exige encore d'accepter les CGU → 1 écran Stripe (pas le long parcours société)
      if (data.tos_accept_url && !data.payouts_enabled) {
        setInfo('Redirection pour accepter les conditions Stripe…');
        window.location.assign(data.tos_accept_url);
        return;
      }

      setTimeout(() => onClose(), data.payouts_enabled || data.ready ? 600 : 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-bg">
      <header className="shrink-0 border-b border-border bg-header/95 backdrop-blur-md px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-text-2 text-sm font-semibold py-1 -ml-1"
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <GhostLogo size={28} />
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">Lier mon RIB</p>
              <p className="text-[11px] text-text-3 truncate">Particulier · identité + banque</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <form onSubmit={submit} className="max-w-lg mx-auto space-y-4">
          <div className="ui-card p-4 flex gap-3 items-start">
            <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div className="text-xs text-text-2 space-y-1">
              <p className="font-semibold text-text">Comme un virement perso</p>
              <p>
                On te demande uniquement ton identité et ton RIB.
                Pas de société, pas de SIRET, pas de « type d’entreprise ».
              </p>
            </div>
          </div>

          <section className="ui-card p-4 space-y-3">
            <h2 className="font-bold text-sm">Toi</h2>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-text-3">
                Prénom
                <input
                  required
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={set('firstName')}
                  className="search-bar mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-xs text-text-3">
                Nom
                <input
                  required
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={set('lastName')}
                  className="search-bar mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
            </div>
            <label className="block text-xs text-text-3">
              Date de naissance
              <input
                required
                type="date"
                autoComplete="bday"
                value={form.birthDate}
                onChange={set('birthDate')}
                className="search-bar mt-1 w-full px-3 py-2.5 text-sm"
              />
            </label>
          </section>

          <section className="ui-card p-4 space-y-3">
            <h2 className="font-bold text-sm">Adresse</h2>
            <label className="block text-xs text-text-3">
              Rue
              <input
                required
                autoComplete="address-line1"
                value={form.addressLine1}
                onChange={set('addressLine1')}
                className="search-bar mt-1 w-full px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-xs text-text-3">
              Complément (optionnel)
              <input
                autoComplete="address-line2"
                value={form.addressLine2}
                onChange={set('addressLine2')}
                className="search-bar mt-1 w-full px-3 py-2.5 text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs text-text-3">
                Code postal
                <input
                  required
                  autoComplete="postal-code"
                  value={form.postalCode}
                  onChange={set('postalCode')}
                  className="search-bar mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-xs text-text-3">
                Ville
                <input
                  required
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={set('city')}
                  className="search-bar mt-1 w-full px-3 py-2.5 text-sm"
                />
              </label>
            </div>
          </section>

          <section className="ui-card p-4 space-y-3">
            <h2 className="font-bold text-sm">Compte bancaire</h2>
            <label className="block text-xs text-text-3">
              IBAN
              <input
                required
                autoComplete="off"
                spellCheck={false}
                placeholder="FR76 …"
                value={form.iban}
                onChange={set('iban')}
                className="search-bar mt-1 w-full px-3 py-2.5 text-sm font-mono tracking-wide"
              />
            </label>
            <p className="text-[11px] text-text-3">
              Virement vers ce RIB en 1–3 jours ouvrés après un retrait.
            </p>
          </section>

          {error && (
            <p className="text-sm text-rose font-semibold bg-rose/10 border border-rose/25 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-seller font-semibold bg-pink/10 border border-pink/20 rounded-xl px-3 py-2">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-accent w-full py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…
              </>
            ) : (
              'Enregistrer mon RIB'
            )}
          </button>

          <p className="text-[10px] text-text-3 text-center leading-relaxed pb-8">
            En continuant, tu confirmes que les infos sont exactes et que tu acceptes
            les conditions de paiement nécessaires aux virements (Stripe, pour le compte de badirty).
          </p>
        </form>
      </div>
    </div>
  );
}
