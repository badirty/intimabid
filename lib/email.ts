import { readEnv } from '@/lib/env';

const RESEND_API = 'https://api.resend.com/emails';

const FROM = 'badirty <noreply@badirty.fr>';
const CONTACT = 'info@badirty.fr';

export async function sendTransactionalEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = readEnv('RESEND_API_KEY');
  if (!apiKey) return { ok: false, skipped: true as const };

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err };
  }
  return { ok: true };
}

// ─── Templates HTML pour les emails transactionnels ───

function baseTemplate(title: string, body: string, cta?: { label: string; url: string }) {
  const ctaHtml = cta
    ? `<a href="${cta.url}" style="display:inline-block;margin-top:16px;padding:14px 32px;background:linear-gradient(135deg,#a855f7 0%,#ec4899 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:14px;box-shadow:0 4px 24px rgba(168,85,247,0.35);">${cta.label}</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${title}</title></head>
<body style="margin:0;padding:32px 16px;background:#06040a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#faf5ff;">
  <div style="max-width:420px;margin:0 auto;background:#0d0b18;border:1px solid rgba(168,85,247,0.25);border-radius:20px;padding:32px 28px;">
    <p style="margin:0 0 8px;font-size:24px;font-weight:800;letter-spacing:0.04em;color:#faf5ff;">badirty</p>
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:800;line-height:1.3;">${title}</h1>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#a89bb5;">${body}</p>
    ${ctaHtml}
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#6b5e7a;">
        Un souci avec ta commande ou une question ? Écris-nous à <a href="mailto:${CONTACT}" style="color:#a855f7;text-decoration:none;">${CONTACT}</a>.
      </p>
      <p style="margin:8px 0 0;font-size:11px;line-height:1.5;color:#6b5e7a;">
        © badirty · <a href="https://badirty.fr" style="color:#a855f7;text-decoration:none;">badirty.fr</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

/** Email envoyé quand un utilisateur se fait surenchérir. */
export function buildOutbidEmail(params: {
  auctionTitle: string;
  outbidAmount: string;
  auctionUrl: string;
}) {
  return baseTemplate(
    'Tu as été surenchéri ! 🔥',
    `Quelqu'un a mis une offre plus élevée sur <strong>« ${params.auctionTitle} »</strong>.<br/>La nouvelle offre est à <strong>${params.outbidAmount} €</strong>. Reviens vite pour garder la main !`,
    { label: "Voir l'enchère", url: params.auctionUrl },
  );
}

/** Email envoyé au gagnant d'une enchère. */
export function buildWonAuctionEmail(params: {
  auctionTitle: string;
  finalPrice: string;
  orderUrl: string;
}) {
  return baseTemplate(
    'Tu as gagné ! 🎉',
    `Félicitations, tu as remporté l'enchère <strong>« ${params.auctionTitle} »</strong> pour <strong>${params.finalPrice} €</strong>.<br/>Ajoute ton adresse de livraison pour que le vendeur puisse expédier ton article.`,
    { label: 'Voir ma commande', url: params.orderUrl },
  );
}

/** Email envoyé au vendeur quand son enchère est vendue. */
export function buildSellerSaleEmail(params: {
  auctionTitle: string;
  finalPrice: string;
  buyerName: string;
  orderUrl: string;
}) {
  return baseTemplate(
    'Vente conclue ! 💰',
    `Ton enchère <strong>« ${params.auctionTitle} »</strong> a été vendue à <strong>@${params.buyerName}</strong> pour <strong>${params.finalPrice} €</strong>.<br/>Le montant sera crédité sur ton portefeuille une fois la commande livrée.`,
    { label: 'Voir la commande', url: params.orderUrl },
  );
}

/** Email envoyé quand une commande est expédiée. */
export function buildOrderShippedEmail(params: {
  auctionTitle: string;
  trackingNumber?: string;
  orderUrl: string;
}) {
  const tracking = params.trackingNumber
    ? `<br/>Numéro de suivi : <strong>${params.trackingNumber}</strong>`
    : '';
  return baseTemplate(
    'Commande expédiée 📦',
    `Ta commande <strong>« ${params.auctionTitle} »</strong> a été expédiée par le vendeur.${tracking}`,
    { label: 'Voir ma commande', url: params.orderUrl },
  );
}