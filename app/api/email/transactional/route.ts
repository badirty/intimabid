import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/admin';
import {
  sendTransactionalEmail,
  buildOutbidEmail,
  buildWonAuctionEmail,
  buildSellerSaleEmail,
  buildOrderShippedEmail,
} from '@/lib/email';
import { siteUrl } from '@/lib/env';

type EmailEvent =
  | { event: 'outbid'; auctionId: string; outbidAmountCents: number }
  | { event: 'won_auction'; auctionId: string; winnerId: string }
  | { event: 'seller_sale'; auctionId: string; sellerId: string }
  | { event: 'order_shipped'; orderId: string; trackingNumber?: string };

export async function POST(request: NextRequest) {
  // Vérification auth minimale : l'utilisateur doit être connecté
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const admin = createAdminClient();

  try {
    const body: EmailEvent = await request.json();

    switch (body.event) {
      case 'outbid': {
        const { data: auction } = await supabase
          .from('auctions')
          .select('title, current_price_cents')
          .eq('id', body.auctionId)
          .maybeSingle();
        if (!auction) break;

        // Récupérer le précédent plus offrant via admin (RLS bloque l'accès aux notifs d'autrui)
        const { data: outbidUser } = await admin
          .from('notifications')
          .select('user_id')
          .eq('auction_id', body.auctionId)
          .eq('type', 'outbid')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!outbidUser) break;

        const { data: authUser } = await admin.auth.admin.getUserById(outbidUser.user_id);
        const email = authUser?.user?.email;
        if (!email) break;

        const html = buildOutbidEmail({
          auctionTitle: auction.title,
          outbidAmount: (body.outbidAmountCents / 100).toFixed(2),
          auctionUrl: siteUrl,
        });
        await sendTransactionalEmail({ to: email, subject: 'Tu as été surenchéri ! 🔥', html });
        break;
      }

      case 'won_auction': {
        const { data: auction } = await supabase
          .from('auctions')
          .select('title, current_price_cents, winner_id')
          .eq('id', body.auctionId)
          .maybeSingle();
        if (!auction?.winner_id) break;

        const { data: authUser } = await admin.auth.admin.getUserById(auction.winner_id);
        const email = authUser?.user?.email;
        if (!email) break;

        const html = buildWonAuctionEmail({
          auctionTitle: auction.title,
          finalPrice: (auction.current_price_cents / 100).toFixed(2),
          // TODO: lien vers la page de commande dédiée quand elle existera
          orderUrl: `${siteUrl}?tab=orders`,
        });
        await sendTransactionalEmail({ to: email, subject: 'Tu as gagné ! 🎉', html });
        break;
      }

      case 'seller_sale': {
        const { data: auction } = await supabase
          .from('auctions')
          .select('title, current_price_cents, winner_id, seller_id')
          .eq('id', body.auctionId)
          .maybeSingle();
        if (!auction?.seller_id) break;

        const { data: sellerAuth } = await admin.auth.admin.getUserById(auction.seller_id);
        const sellerEmail = sellerAuth?.user?.email;
        if (!sellerEmail) break;

        // Récupérer le nom de l'acheteur
        const { data: buyerProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', auction.winner_id)
          .maybeSingle();

        const html = buildSellerSaleEmail({
          auctionTitle: auction.title,
          finalPrice: (auction.current_price_cents / 100).toFixed(2),
          buyerName: buyerProfile?.display_name ?? 'Acheteur',
          // TODO: lien vers la page de commande dédiée quand elle existera
          orderUrl: `${siteUrl}?tab=orders`,
        });
        await sendTransactionalEmail({ to: sellerEmail, subject: 'Vente conclue ! 💰', html });
        break;
      }

      case 'order_shipped': {
        const { data: order } = await supabase
          .from('orders')
          .select('buyer_id, auction_id')
          .eq('id', body.orderId)
          .maybeSingle();
        if (!order) break;

        const { data: auction } = await supabase
          .from('auctions')
          .select('title')
          .eq('id', order.auction_id)
          .maybeSingle();

        const { data: authUser } = await admin.auth.admin.getUserById(order.buyer_id);
        const email = authUser?.user?.email;
        if (!email) break;

        const html = buildOrderShippedEmail({
          auctionTitle: auction?.title ?? 'Commande',
          trackingNumber: body.trackingNumber,
          orderUrl: siteUrl,
        });
        await sendTransactionalEmail({ to: email, subject: 'Commande expédiée 📦', html });
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
