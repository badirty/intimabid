# Paiements pour Badirty (contenu adulte)

## ⚠️ Problème avec Stripe

Stripe interdit la plupart des contenus et services adultes dans sa [Acceptable Use Policy](https://stripe.com/restricted-businesses). Utiliser Stripe pour une marketplace de sous-vêtements portés / contenu adulte expose à :

- Fermeture immédiate du compte Stripe
- Gel des fonds (souvent 180 jours)
- Inscription sur la liste MATCH (blacklist bancaire)

## ✅ Solutions alternatives

### 1. CCBill (recommandé pour l'adult)
- Leader historique du paiement adult
- Supporte les marketplaces, abonnements, paiements uniques
- KYC strict mais stable
- Site : https://www.ccbill.com

### 2. Verotel
- Spécialisé high-risk depuis 1998
- Très utilisé en Europe
- Site : https://www.verotel.com

### 3. Epoch
- Autre acteur majeur de l'adult
- Bon pour les paiements internationaux
- Site : https://www.epoch.com

### 4. MobiusPay / Corepay / Vendo
- Acquéreurs high-risk généralistes
- Utiles si CCBill/Verotel refusent

## 🛡️ Stratégie recommandée pour Badirty

1. **Ne pas compteur sur Stripe** pour les vrais paiements utilisateurs.
2. **Ouvrir un compte marchand chez CCBill ou Verotel** dès maintenant.
3. **Garder Stripe uniquement en mode TEST** pendant la beta technique (pas de vrai argent).
4. **Remplacer l'intégration Stripe Checkout** par l'API du processeur choisi une fois le compte approuvé.
5. **Documenter les CGU et la nature du service** clairement pour le KYC.

## 🔧 Implémentation technique actuelle

- Le code actuel utilise Stripe Checkout pour recharger le portefeuille.
- Le webhook Stripe crédite le wallet via `lib/stripe-credit.ts`.
- Pour migrer vers CCBill/Verotel, il faudra :
  - Remplacer `app/api/stripe/checkout/route.ts`
  - Remplacer `app/api/stripe/webhook/route.ts`
  - Adapter `lib/stripe-credit.ts` ou créer un équivalent

## 📌 Note sur vends-ta-culotte.com

Vends-ta-culotte.com utilise très probablement un processeur spécialisé adult (CCBill, Verotel ou équivalent), car Stripe/PayPal n'acceptent pas ce type de marketplace.
