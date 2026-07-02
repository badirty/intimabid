'use client';

import type { AppMode } from '@/lib/types';

export default function ModeSwitcher({
  mode,
  onChange,
}: {
  mode: AppMode;
  onChange: (m: AppMode) => void;
}) {
  return (
    <div className="mode-pill">
      <button
        className={mode === 'buyer' ? 'active-buyer' : ''}
        onClick={() => onChange('buyer')}
      >
        Acheteur
      </button>
      <button
        className={mode === 'seller' ? 'active-seller' : ''}
        onClick={() => onChange('seller')}
      >
        Vendeur
      </button>
    </div>
  );
}