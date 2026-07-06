'use client';

import { useEffect, useState } from 'react';
import { formatCountdown } from '@/lib/format';

export function useCountdown(endsAt: string) {
  const [label, setLabel] = useState(() => formatCountdown(endsAt));

  useEffect(() => {
    const tick = () => setLabel(formatCountdown(endsAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return label;
}