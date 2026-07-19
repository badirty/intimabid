import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/admin';
import {
  sendTransactionalEmail,
  buildWonAuctionEmail,
  buildSellerSaleEmail,
} from '@/lib/email';
import { siteUrl } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;

  if (!expected || authHeader !== expected) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const admin = createAdminClient();

  // 1. Clôturer les enchères expirées
  const { error } = await admin.rpc('close_expired_auctions');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. Envoyer les emails pour les enchères qui viennent de se terminer (vendu)
  try {
    const { data: soldAuctions } = await admin
      .from('auctions')
      .select('id, title, current_price_cents, seller_id, winner_id')
      .eq('status', 'sold')
      .not('winner_id', 'is', null)
      .gt('ends_at', new Date(Date.now() - 30 * 60_000).toISOString())
      .order('ends_at', { ascending: false })
      .limit(20);

    for (const a of soldAuctions ?? []) {
      if (!a.winner_id || !a.seller_id) continue;

      // Email au gagnant
      const { data: winnerAuth } = await admin.auth.admin.getUserById(a.winner_id);
      if (winnerAuth?.user?.email) {
        const html = buildWonAuctionEmail({
          auctionTitle: a.title,
          finalPrice: (a.current_price_cents / 100).toFixed(2),
          // TODO: lien vers la page de commande dédiée quand elle existera
          orderUrl: `${siteUrl}?tab=orders`,
        });
        await sendTransactionalEmail({
          to: winnerAuth.user.email,
          subject: 'Tu as gagné ! 🎉',
          html,
        }).catch(() => {});
      }

      // Email au vendeur
      const { data: sellerAuth } = await admin.auth.admin.getUserById(a.seller_id);
      if (sellerAuth?.user?.email) {
        const { data: buyerProfile } = await admin
          .from('profiles')
          .select('display_name')
          .eq('id', a.winner_id)
          .maybeSingle();

        const html = buildSellerSaleEmail({
          auctionTitle: a.title,
          finalPrice: (a.current_price_cents / 100).toFixed(2),
          buyerName: buyerProfile?.display_name ?? 'Acheteur',
          // TODO: lien vers la page de commande dédiée quand elle existera
          orderUrl: `${siteUrl}?tab=orders`,
        });
        await sendTransactionalEmail({
          to: sellerAuth.user.email,
          subject: 'Vente conclue ! 💰',
          html,
        }).catch(() => {});
      }
    }
  } catch {
    // L'envoi d'email est secondaire — ne pas bloquer le cron
  }

  return NextResponse.json({ ok: true });
}
