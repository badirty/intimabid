'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Users, Gavel, Package, CreditCard, AlertTriangle, ArrowLeft,
} from 'lucide-react';
import { centsToEuros } from '@/lib/format';
import type { AdminStats, AdminReport, AdminUser, AdminAuction, AdminWithdrawal } from '@/lib/admin';

type Tab = 'stats' | 'reports' | 'users' | 'auctions' | 'withdrawals';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auctions, setAuctions] = useState<AdminAuction[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((data) => {
        if (!data.isAdmin) {
          router.replace('/');
          return;
        }
        setIsAdmin(true);
      })
      .catch(() => router.replace('/'));
  }, [router]);

  useEffect(() => {
    if (!isAdmin) return;
    loadAll();
  }, [isAdmin]);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, reportsRes, usersRes, auctionsRes, withdrawalsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/reports'),
        fetch('/api/admin/users'),
        fetch('/api/admin/auctions'),
        fetch('/api/admin/withdrawals'),
      ]);

      const responses = [statsRes, reportsRes, usersRes, auctionsRes, withdrawalsRes];
      if (responses.some((r) => !r.ok)) {
        throw new Error('Erreur lors du chargement des données admin');
      }

      setStats(await statsRes.json());
      setReports(await reportsRes.json());
      setUsers(await usersRes.json());
      setAuctions(await auctionsRes.json());
      setWithdrawals(await withdrawalsRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Erreur suppression');
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const toggleSuspend = async (user: AdminUser) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspend: !user.suspended_at }),
      });
      if (!res.ok) throw new Error('Erreur suspension');
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, suspended_at: u.suspended_at ? null : new Date().toISOString() }
            : u,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-text-2">
        Vérification des accès…
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-text-2">
        Chargement du dashboard admin…
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg-phone text-text">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Shield className="w-6 h-6 text-accent" />
          <h1 className="text-xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>
            Admin Badirty
          </h1>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose/10 border border-rose/30 text-rose text-sm">
            {error}
          </div>
        )}

        <div className="tab-bar mb-6">
          {[
            { key: 'stats', label: 'Stats' },
            { key: 'reports', label: 'Signalements' },
            { key: 'users', label: 'Utilisateurs' },
            { key: 'auctions', label: 'Enchères' },
            { key: 'withdrawals', label: 'Retraits' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key as Tab)}
              className={activeTab === t.key ? 'active' : ''}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Users className="w-5 h-5" />} label="Utilisateurs" value={stats.users_count} />
            <StatCard icon={<Gavel className="w-5 h-5" />} label="Enchères" value={stats.auctions_count} />
            <StatCard icon={<Package className="w-5 h-5" />} label="Commandes" value={stats.orders_count} />
            <StatCard icon={<CreditCard className="w-5 h-5" />} label="Retraits en attente" value={stats.pending_withdrawals_count} />
            <StatCard icon={<Gavel className="w-5 h-5" />} label="Enchères live" value={stats.live_auctions_count} />
            <StatCard icon={<Gavel className="w-5 h-5" />} label="Ventes" value={stats.sold_auctions_count} />
            <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="Signalements" value={stats.reports_count} colSpan />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-3">
            {reports.length === 0 && <p className="text-text-2 text-sm">Aucun signalement.</p>}
            {reports.map((r) => (
              <div key={r.id} className="ui-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm">{r.reason}</p>
                    <p className="text-text-2 text-xs mt-1">{r.details}</p>
                    <p className="text-text-3 text-xs mt-2">
                      Par {r.reporter_name ?? r.reporter_email ?? r.reporter_id}
                      {r.auction_id && ` • Enchère ${r.auction_id}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteReport(r.id)}
                    disabled={busy}
                    className="text-xs text-rose hover:underline disabled:opacity-50"
                  >
                    Archiver
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-3">
            {users.length === 0 && <p className="text-text-2 text-sm">Aucun utilisateur.</p>}
            {users.map((u) => (
              <div key={u.id} className="ui-card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-sm">{u.display_name ?? 'Sans nom'}</p>
                  <p className="text-text-3 text-xs">{u.email ?? u.id}</p>
                  <p className="text-text-3 text-xs mt-1">
                    Solde : {centsToEuros(u.balance_cents)} €
                    {u.suspended_at && <span className="text-rose ml-2">Suspendu</span>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSuspend(u)}
                  disabled={busy}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    u.suspended_at
                      ? 'bg-accent/10 text-accent hover:bg-accent/20'
                      : 'bg-rose/10 text-rose hover:bg-rose/20'
                  } disabled:opacity-50`}
                >
                  {u.suspended_at ? 'Réactiver' : 'Suspendre'}
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'auctions' && (
          <div className="space-y-3">
            {auctions.length === 0 && <p className="text-text-2 text-sm">Aucune enchère.</p>}
            {auctions.map((a) => (
              <div key={a.id} className="ui-card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-sm truncate">{a.title}</p>
                  <p className="text-text-3 text-xs">{a.seller_email ?? a.seller_id}</p>
                  <p className="text-text-3 text-xs mt-1">
                    {centsToEuros(a.current_price_cents)} € • {a.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="space-y-3">
            {withdrawals.length === 0 && <p className="text-text-2 text-sm">Aucun retrait.</p>}
            {withdrawals.map((w) => (
              <div key={w.id} className="ui-card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-sm">{centsToEuros(w.amount_cents)} €</p>
                  <p className="text-text-3 text-xs">{w.user_email ?? w.user_id}</p>
                  <p className="text-text-3 text-xs mt-1 capitalize">{w.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  colSpan,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  colSpan?: boolean;
}) {
  return (
    <div className={`ui-card p-4 ${colSpan ? 'col-span-2 md:col-span-1' : ''}`}>
      <div className="flex items-center gap-2 text-accent mb-2">{icon}</div>
      <p className="text-3xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>
        {value}
      </p>
      <p className="text-text-3 text-xs mt-1">{label}</p>
    </div>
  );
}
