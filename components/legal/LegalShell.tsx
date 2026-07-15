import Link from 'next/link';
import type { ReactNode } from 'react';

const LEGAL_LINKS = [
  { href: '/mentions-legales', label: 'Mentions légales' },
  { href: '/terms', label: 'CGU' },
  { href: '/privacy', label: 'Confidentialité' },
  { href: '/contact', label: 'Contact' },
] as const;

export default function LegalShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="app-shell min-h-dvh px-4 py-8 max-w-lg mx-auto">
      <Link href="/" className="text-accent text-sm font-semibold mb-6 inline-block">
        ← Retour à badirty
      </Link>
      <h1
        className="text-2xl font-extrabold mb-2"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h1>
      {subtitle && <p className="text-text-3 text-xs mb-6">{subtitle}</p>}
      <article className="legal-prose space-y-6 text-sm text-text-2 leading-relaxed">
        {children}
      </article>
      <nav className="mt-10 pt-6 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-3">
        {LEGAL_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-accent transition-colors">
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}