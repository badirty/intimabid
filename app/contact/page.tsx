import Link from 'next/link';

export default function ContactPage() {
  return (
    <div className="app-shell min-h-dvh px-4 py-8 max-w-md mx-auto">
      <Link href="/" className="text-accent text-sm font-semibold mb-6 inline-block">← Retour</Link>
      <h1 className="text-2xl font-extrabold mb-4" style={{ fontFamily: 'var(--font-display)' }}>Contact & SAV</h1>
      <div className="ui-card p-5 space-y-4 text-sm text-text-2 leading-relaxed">
        <p>Une question, un problème de commande ou un signalement ?</p>
        <p>
          Écris-nous à{' '}
          <a href="mailto:support@badirty.fr" className="text-accent font-semibold hover:underline">
            support@badirty.fr
          </a>
        </p>
        <p className="text-text-3 text-xs">Délai de réponse habituel : 24–48 h ouvrées.</p>
      </div>
    </div>
  );
}