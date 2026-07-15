'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { submitReport } from '@/lib/db';

export default function ReportModal({
  auctionId,
  onClose,
}: {
  auctionId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('Contenu inapproprié');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await submitReport(auctionId, reason, details);
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-end justify-center p-4" onClick={onClose}>
      <div className="ui-card w-full max-w-sm p-5 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">Signaler</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        {done ? (
          <p className="text-accent text-sm text-center py-4">Merci, ton signalement a été enregistré.</p>
        ) : (
          <>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="search-bar w-full px-3 py-2.5 text-sm mb-3">
              <option>Contenu inapproprié</option>
              <option>Arnaque / fraude</option>
              <option>Photo trompeuse</option>
              <option>Autre</option>
            </select>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Détails (optionnel)"
              rows={3}
              className="textarea-bar w-full px-3 py-2 text-sm mb-3"
            />
            <button type="button" onClick={submit} disabled={loading} className="btn-accent w-full py-3 text-sm">
              {loading ? '...' : 'Envoyer'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}