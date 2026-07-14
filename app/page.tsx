'use client';

import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { hasCompletedOnboarding } from '@/lib/auth';
import AuthPage from '@/components/auth/AuthPage';
import LandingPage from '@/components/landing/LandingPage';
import OnboardingWelcome from '@/components/onboarding/OnboardingWelcome';
import AppShell from '@/components/app/AppShell';
import { ensureUserBootstrap } from '@/lib/db';
import GhostLogo from '@/components/brand/GhostLogo';

type UnauthView = 'landing' | 'login' | 'signup';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unauthView, setUnauthView] = useState<UnauthView>('landing');

  const syncUser = (sessionUser: User | null) => {
    setUser(sessionUser);
    if (sessionUser) {
      setOnboarded(hasCompletedOnboarding(sessionUser));
      ensureUserBootstrap(sessionUser.id, sessionUser.email).catch(() => {});
    } else {
      setOnboarded(false);
    }
  };

  useEffect(() => {
    let resolved = false;

    const finishLoading = () => {
      if (!resolved) {
        resolved = true;
        setLoading(false);
      }
    };

    // Timeout de sécurité — ne pas bloquer indéfiniment
    const timeout = setTimeout(finishLoading, 4000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUser(session?.user ?? null);
      finishLoading();
    });

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        syncUser(session?.user ?? null);
        finishLoading();
      })
      .catch(() => {
        finishLoading();
      });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOnboarded(false);
  };

  const handleOnboardingComplete = async (_mode?: string) => {
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

  if (!onboarded) {
    return <OnboardingWelcome userEmail={user.email} onComplete={handleOnboardingComplete} />;
  }

  return (
    <AppShell
      user={user}
      onSignOut={handleSignOut}
    />
  );
}