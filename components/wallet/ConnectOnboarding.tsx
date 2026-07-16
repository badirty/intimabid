'use client';

import { useEffect, useState } from 'react';
import { loadConnectAndInitialize } from '@stripe/connect-js/pure';
import type { StripeConnectInstance } from '@stripe/connect-js';
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from '@stripe/react-connect-js';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import GhostLogo from '@/components/brand/GhostLogo';

const BADIRTY_APPEARANCE = {
  overlays: 'dialog' as const,
  variables: {
    colorPrimary: '#a855f7',
    colorBackground: '#0d0b18',
    colorText: '#faf5ff',
    colorDanger: '#f43f5e',
    buttonPrimaryColorBackground: '#a855f7',
    buttonPrimaryColorBorder: '#a855f7',
    buttonPrimaryColorText: '#ffffff',
    buttonSecondaryColorBackground: 'rgba(255,255,255,0.06)',
    buttonSecondaryColorBorder: 'rgba(255,255,255,0.12)',
    buttonSecondaryColorText: '#faf5ff',
    borderRadius: '12px',
    spacingUnit: '10px',
    fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
    fontSizeBase: '15px',
  },
};

type Props = {
  onClose: () => void;
  onCompleted: () => void;
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

async function createAccountSession(forceReset = false): Promise<{
  client_secret: string;
  publishable_key: string;
  recreated?: boolean;
}> {
  const res = await fetch('/api/stripe/connect/account-session', {
    method: 'POST',
    credentials: 'same-origin',
    headers: await authHeaders(),
    body: JSON.stringify({ force_reset: forceReset }),
  });
  const data = (await res.json()) as {
    client_secret?: string;
    publishable_key?: string;
    recreated?: boolean;
    error?: string;
  };
  if (!res.ok || !data.client_secret || !data.publishable_key) {
    throw new Error(data.error ?? 'Impossible de démarrer la config bancaire');
  }
  return {
    client_secret: data.client_secret,
    publishable_key: data.publishable_key,
    recreated: data.recreated,
  };
}

export default function ConnectOnboarding({ onClose, onCompleted }: Props) {
  const [connectInstance, setConnectInstance] = useState<StripeConnectInstance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  /** Incrémenté pour remonter le formulaire (ex. reset forcé) */
  const [bootKey, setBootKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setConnectInstance(null);

        // 1er appel : remplace auto les anciens comptes société
        // bootKey > 0 → force_reset explicite (bouton "recommencer particulier")
        const first = await createAccountSession(bootKey > 0);
        if (cancelled) return;

        if (first.recreated || bootKey > 0) {
          setBanner('Nouveau parcours particulier — plus de questions société / SIRET.');
        }

        let cachedSecret: string | null = first.client_secret;

        const instance = loadConnectAndInitialize({
          publishableKey: first.publishable_key,
          fetchClientSecret: async () => {
            if (cachedSecret) {
              const secret = cachedSecret;
              cachedSecret = null;
              return secret;
            }
            const next = await createAccountSession(false);
            return next.client_secret;
          },
          locale: 'fr-FR',
          appearance: BADIRTY_APPEARANCE,
        });

        setConnectInstance(instance);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Erreur de chargement');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootKey]);

  const handleExit = () => {
    onCompleted();
    onClose();
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
              <p className="font-bold text-sm truncate">Lier mon compte bancaire</p>
              <p className="text-[11px] text-text-3 truncate">Particulier · identité + RIB</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="ui-card p-4 mb-4 flex gap-3 items-start">
            <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div className="text-xs text-text-2 space-y-1">
              <p className="font-semibold text-text">Particulier · retrait vers ton RIB</p>
              <p>
                Stripe affiche parfois « type d’entreprise » : choisis{' '}
                <strong className="text-text">Entrepreneur individuel</strong>
                {' '}(personne physique). <strong className="text-text">Pas Société</strong>, pas Association.
                C’est le libellé légal Stripe — ce n’est pas une SARL ni un SIRET obligatoire pour démarrer.
              </p>
            </div>
          </div>

          {banner && (
            <p className="text-xs text-seller font-semibold mb-3 bg-pink/10 border border-pink/20 rounded-lg px-3 py-2">
              {banner}
            </p>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-2">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <p className="text-sm font-medium">Préparation du formulaire…</p>
            </div>
          )}

          {error && (
            <div className="ui-card p-4 border border-rose/30 bg-rose/10">
              <p className="text-sm text-rose font-semibold mb-2">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost w-full py-2.5 text-xs"
              >
                Fermer
              </button>
            </div>
          )}

          {!loading && !error && connectInstance && (
            <div className="ui-card p-3 sm:p-4 min-h-[420px]">
              <ConnectComponentsProvider connectInstance={connectInstance}>
                <ConnectAccountOnboarding
                  onExit={handleExit}
                  collectionOptions={{
                    fields: 'currently_due',
                    futureRequirements: 'omit',
                  }}
                  privacyPolicyUrl="https://badirty.fr/privacy"
                  fullTermsOfServiceUrl="https://badirty.fr/terms"
                  onLoadError={({ error: loadErr }) => {
                    setError(loadErr?.message ?? 'Impossible de charger le formulaire');
                  }}
                />
              </ConnectComponentsProvider>
            </div>
          )}

          {!loading && (
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setBanner(null);
                setBootKey((k) => k + 1);
              }}
              className="mt-4 w-full text-center text-[11px] text-text-3 underline underline-offset-2 hover:text-text-2 py-2"
            >
              Toujours des questions société ? Recommencer en particulier
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
