'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';
import { confirmAge } from '@/lib/db';

export default function AgeGate({ userId, onConfirmed }: { userId: string; onConfirmed: () => void }) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!checked) { setError('Tu dois confirmer avoir 18 ans ou plus.'); return; }
    setLoading(true);
    setError(null);
    try {
      await confirmAge(userId);
      onConfirmed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell flex items-center justify-center p-6 min-h-dvh">
      <div className="w-full max-w-sm ui-card p-6 text-center animate-slide-up">
        <div className="ghost-logo-wrap w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)' }}>Accès réservé aux adultes</h1>
        <p className="text-text-2 text-sm mb-6 leading-relaxed">
          badirty propose des enchères intimes réservées aux personnes majeures (18+).
        </p>
        <label className="flex items-start gap-3 text-left text-sm mb-4 cursor-pointer">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1 accent-accent" />
          <span>Je confirme avoir <strong>18 ans ou plus</strong> et accepter les <a href="/terms" className="text-accent hover:underline">CGU</a>.</span>
        </label>
        {error && <p className="text-rose text-xs mb-3">{error}</p>}
        <button type="button" onClick={submit} disabled={loading} className="btn-accent w-full py-3.5 text-sm disabled:opacity-50">
          {loading ? '...' : 'Entrer sur badirty'}
        </button>
      </div>
    </div>
  );
}