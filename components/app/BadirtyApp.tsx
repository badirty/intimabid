'use client';

import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { hasCompletedOnboarding } from '@/lib/auth';
import AuthPage from '@/components/auth/AuthPage';
import LandingPage from '@/components/landing/LandingPage';
import OnboardingWelcome from '@/components/onboarding/OnboardingWelcome';
import AgeGate from '@/components/onboarding/AgeGate';
import AppShell from '@/components/app/AppShell';
import { ensureUserBootstrap, hasConfirmedAge, isUserSuspended } from '@/lib/db';
import { AlertCircle, LogOut } from 'lucide-react';
import GhostLogo from '@/components/brand/GhostLogo';

type UnauthView = 'landing' | 'login' | 'signup';

export default function BadirtyApp({
  initialAuctionId,
  initialSellerId,
}: {
  initialAuctionId?: string;
  initialSellerId?: string;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unauthView, setUnauthView] = useState<UnauthView>('landing');
  const [isSuspended, setIsSuspended] = useState(false);

  const syncUser = async (sessionUser: User | null) => {
    setUser(sessionUser);
    if (sessionUser) {
      const suspended = await isUserSuspended(sessionUser.id).catch(() => false);
      setIsSuspended(suspended);
      if (suspended) {
        setOnboarded(false);
        setAgeOk(false);
        return;
      }
      setOnboarded(hasCompletedOnboarding(sessionUser));
      await ensureUserBootstrap(sessionUser.id, sessionUser.email, sessionUser).catch(() => {});
      setAgeOk(await hasConfirmedAge(sessionUser.id).catch(() => false));
    } else {
      setIsSuspended(false);
      setOnboarded(false);
      setAgeOk(false);
    }
  };

  useEffect(() => {
    let resolved = false;
    const finishLoading = () => { if (!resolved) { resolved = true; setLoading(false); } };
    const timeout = setTimeout(finishLoading, 4000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUser(session?.user ?? null).finally(finishLoading);
    });

    supabase.auth.getSession()
      .then(({ data: { session } }) => syncUser(session?.user ?? null))
      .finally(finishLoading);

    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOnboarded(false);
    setAgeOk(false);
  };

  const handleOnboardingComplete = async () => {
    const { data: { user: updatedUser } } = await supabase.auth.getUser();
    if (updatedUser) {
      setUser(updatedUser);
      setOnboarded(true);
    }
  };

  if (loading) {
    return (
      <div className="app-shell">
        <div className="flex flex-col items-center justify-center gap-4 flex-1 min-h-dvh">
          <div className="ghost-logo-wrap w-14 h-14 rounded-2xl flex items-center justify-center animate-ghost-float">
            <GhostLogo size={36} />
          </div>
          <p className="text-text-2 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (unauthView === 'landing') {
      return <LandingPage onNavigate={(v) => setUnauthView(v)} />;
    }
    return (
      <AuthPage
        initialView={unauthView}
        onBack={() => setUnauthView('landing')}
        onAuthSuccess={() =>
          supabase.auth.getSession().then(({ data }) => syncUser(data.session?.user ?? null))
        }
      />
    );
  }

  if (isSuspended) {
    return (
      <div className="app-shell">
        <div className="flex flex-col items-center justify-center p-6 flex-1 min-h-dvh text-center">
          <div className="w-16 h-16 rounded-full bg-rose/10 flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-rose" />
          </div>
          <h1 className="text-xl font-bold text-text mb-2">Compte suspendu</h1>
          <p className="text-text-2 mb-2 text-sm max-w-sm">
            L'accès à ton compte a été restreint. Si tu penses qu'il s'agit d'une erreur, contacte le support.
          </p>
          <a href="/contact" className="text-accent text-sm hover:underline mb-8">
            Contact
          </a>
          <button
            type="button"
            onClick={handleSignOut}
            className="btn-ghost flex items-center gap-2 px-6 py-3"
          >
            <LogOut className="w-4 h-4" /> Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  if (!onboarded) {
    return <OnboardingWelcome userEmail={user.email} onComplete={handleOnboardingComplete} />;
  }

  if (!ageOk) {
    return <AgeGate userId={user.id} onConfirmed={() => setAgeOk(true)} />;
  }

  return (
    <AppShell
      user={user}
      onSignOut={handleSignOut}
      initialAuctionId={initialAuctionId}
      initialSellerId={initialSellerId}
    />
  );
}