# Badirty -- Plateforme d'encheres intimes C2C

---

## Ce que fait l'application

**Badirty** est une marketplace d'encheres en ligne reservee aux adultes (18+), ou des particuliers peuvent **vendre aux encheres** ou en **achat immediat** des articles intimes (lingerie, accessoires, tenues, etc.).

L'experience est pensee comme un **reseau social d'encheres** : pseudos, boutiques vendeurs, systeme de favoris, notifications en temps reel. Le tout dans une ambiance sombre, privee, elegante -- loin du marketplace classique.

### Fonctionnalites cles

- **Encheres en direct** avec compte a rebours, surencheres en un clic
- **Achat immediat** (Buy Now) pour les impatients
- **Boutique vendeur** personnalisee
- **Portefeuille virtuel** prepaye (recharge par Stripe)
- **Retraits vendeurs** vers IBAN (Stripe Connect)
- **Flux post-vente complet** type Vinted : adresse de livraison, commande, suivi
- **Notifications en temps reel** (outbid, vente conclue, commande livree)
- **Recherche** d'articles et de vendeurs

---

## Clientele cible

- **Adultes 18-35 ans**, majoritairement francophones (France, Belgique, Suisse)
- **Consommateurs d'univers intimes et alternatifs** : lingerie, mode sensuelle, accessoires de plaisir, tenues de collection
- **Vendeurs particuliers** souhaitant monetiser des articles intimes dans un cadre securise, loin des plateformes generalistes ou ce type de contenu est interdit ou stigmatise
- **Collectionneurs et passionnes** de pieces uniques ou exclusives
- Double usage : **acheteur ET vendeur** (le modele C2C pur, chacun peut basculer entre les deux roles)

---

## Un marche sans concurrence directe

### En France : aucun equivalent

Les plateformes d'encheres generalistes (eBay) interdisent ou restreignent fortement les articles a caractere intime/adulte. Les marketplaces type Vinted, Le Bon Coin, ou Vestiaire Collective excluent cette categorie.

Les sites de vente pour adultes existent, mais sont des e-commerces classiques (B2C), pas des places de marche C2C avec encheres en direct.

### Dans le monde : pas de concurrent identifie

Pas de concurrent identifie sur le creneau "encheres intimes C2C en temps reel". Quelques marketplaces adultes existent (erotiques, fetichistes), mais :

- Soit elles sont en B2C (boutiques classiques)
- Soit ce sont des places de marche statiques (petites annonces, pas d'encheres live)
- Aucune n'offre l'experience "temps reel + wallet + flux post-vente" de Badirty

### Positionnement unique

Badirty est a l'intersection de trois tendances fortes :

1. **L'economie des plateformes C2C** (type Vinted, eBay)
2. **La gamification par les encheres** en temps reel
3. **Le marche adulte/intime**, en forte croissance et largement sous-exploite en mode marketplace

---

## Marche adressable

| Segment | Taille estimee |
|---|---|
| Marche adulte mondial | Environ 50-100 milliards EUR (tous segments confondus) |
| Marche de la lingerie en France | Environ 4 milliards EUR par an |
| Re-commerce / seconde main | Environ 7 milliards EUR en France (Vinted en tete) |
| Encheres en ligne C2C | Segment emergent, pas encore de leader sur le creneau intime |

Meme en captant une fraction minime de ces marches (niche intime + seconde main + encheres), le **potentiel est de plusieurs dizaines de milliers d'utilisateurs actifs** en France uniquement, avec un panier moyen estime entre 15 et 80 EUR par transaction.

---

## Stack technique

| Composant | Technologie | Justification |
|---|---|---|
| **Frontend** | Next.js 16 + React 19 + TailwindCSS 4 | SSR, PWA mobile-first, SEO |
| **Backend** | Next.js API Routes + PostgreSQL (Supabase) | Full-stack JS, serverless-ready |
| **Base de donnees** | PostgreSQL 15 avec Row Level Security, triggers PL/pgSQL | Securite multi-tenant, logique metier cote DB |
| **Temps reel** | Supabase Realtime (WebSockets) | Encheres live sans rafraichissement |
| **Paiements entrants** | Stripe Checkout | Rechargement du portefeuille |
| **Paiements sortants** | Stripe Connect | Virements vendeurs vers IBAN |
| **Stockage** | Supabase Storage | Images des annonces |
| **Authentification** | Supabase Auth (Google OAuth + email) | Auth securisee, sans friction |
| **Etat** | Zustand + React hooks | Simple, rapide, pas d'over-engineering |
| **Hebergement actuel** | Vercel + Supabase Cloud | Deploiement continu, edge network |

### Infrastructure necessaire

1. **Serveur Node.js** -- runtime Next.js (build + SSR). Actuellement sur Vercel (serverless), mais un VPS ou conteneur Docker convient.
2. **Base de donnees PostgreSQL** -- environ 15 tables avec Row Level Security, fonctions PL/pgSQL, triggers pour la cloture automatique des encheres et les credits vendeurs.
3. **Variables d'environnement** : Supabase (URL, anon key, service role), Stripe (publishable, secret, webhook secret), URL du site, flag demo wallet.
4. **Webhooks entrants** -- Stripe envoie des webhooks (`/api/stripe/webhook`).
5. **Connexions WebSocket** -- Supabase Realtime pour les mises a jour en direct.
6. **Domaine** : `badirty.fr`

---

## Contraintes techniques

- **CSP** (Content Security Policy) configuree pour Stripe et Supabase
- **HTTPS** obligatoire
- **RGPD** : consentement explicite, donnees personnelles (adresses postales), droit a l'effacement
- **Row Level Security** PostgreSQL en place
- **Age gate** obligatoire (18+)
- **Design mobile-first** PWA avec safe-area-inset

---

## Roadmap et vision

### Court terme (6-12 mois)

- Croissance du nombre d'utilisateurs et d'encheres live
- Notifications push mobiles (PWA)
- Systeme de reputation / notes vendeurs
- Categories d'articles plus fines
- Programme de parrainage

### Moyen terme (12-24 mois)

- Application mobile native (React Native ou Flutter)
- Expansion europeenne (Allemagne, Espagne, UK, Italie)
- Encheres premium / mises en avant sponsorisees
- Evenements live thematiques (soirees encheres)
- Integration de livraison automatisee (Mondial Relay, Colissimo)

### Long terme (24+ mois)

- Devenir la plateforme de reference des encheres intimes en Europe
- Partenariats avec des createurs / influenceurs du milieu
- Monetisation elargie (commissions, abonnements vendeurs pro, sponsoring)
- Expansion vers d'autres marches adultes (NFT intimes, contenus digitaux)

---

*Document genere le 16 juillet 2026.*
