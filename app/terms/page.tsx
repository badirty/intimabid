import type { Metadata } from 'next';
import LegalShell from '@/components/legal/LegalShell';
import { SITE_LEGAL } from '@/lib/site-legal';

export const metadata: Metadata = {
  title: 'Conditions générales d\'utilisation — badirty',
  description: 'CGU de la plateforme badirty — enchères en direct',
};

export default function TermsPage() {
  const { contactEmail, siteName, lastUpdated } = SITE_LEGAL;

  return (
    <LegalShell title="Conditions générales d'utilisation" subtitle={`Dernière mise à jour : ${lastUpdated}`}>
      <p className="text-text text-sm">
        En créant un compte ou en utilisant {siteName}, vous acceptez sans réserve les présentes CGU.
      </p>

      <section>
        <h2 className="legal-h2">1. Définitions</h2>
        <ul className="legal-list">
          <li><strong>Plateforme :</strong> le site et l&apos;application badirty.</li>
          <li><strong>Utilisateur :</strong> toute personne inscrite.</li>
          <li><strong>Vendeur :</strong> utilisateur proposant une enchère.</li>
          <li><strong>Acheteur :</strong> utilisateur participant à une enchère ou effectuant un achat.</li>
          <li><strong>Portefeuille :</strong> solde prépayé crédité via Stripe, utilisé pour enchérir et acheter.</li>
        </ul>
      </section>

      <section>
        <h2 className="legal-h2">2. Accès au service — majeur obligatoire</h2>
        <p>
          Le service est strictement réservé aux personnes <strong>âgées de 18 ans ou plus</strong>.
          En vous inscrivant, vous déclarez sur l&apos;honneur remplir cette condition.
          badirty peut suspendre tout compte en cas de doute ou de signalement.
        </p>
        <p className="mt-2">
          Le service peut être modifié, suspendu ou interrompu pour maintenance ou sécurité,
          sans indemnité, dans la limite permise par la loi.
        </p>
      </section>

      <section>
        <h2 className="legal-h2">3. Compte utilisateur</h2>
        <p>
          L&apos;inscription requiert une adresse e-mail valide ou un compte OAuth (Google, X).
          Vous êtes responsable de la confidentialité de vos identifiants.
        </p>
        <p className="mt-2">
          Votre <strong>pseudo et bio</strong> peuvent être affichés publiquement sur votre boutique
          si vous l&apos;activez. Votre <strong>adresse e-mail et numéro de téléphone ne sont jamais affichés</strong> aux autres utilisateurs.
        </p>
      </section>

      <section>
        <h2 className="legal-h2">4. Portefeuille et paiements</h2>
        <p>
          Le portefeuille est crédité par paiement sécurisé via <strong>Stripe</strong>.
          Les fonds servent à placer des offres et à régler des achats sur la plateforme.
        </p>
        <ul className="legal-list mt-2">
          <li>Les recharges sont en principe <strong>définitives</strong> sauf erreur technique avérée ou disposition légale.</li>
          <li>En cas de surenchère, le montant de l&apos;offre précédente peut être recrédité automatiquement.</li>
          <li>Les retraits vendeur peuvent être soumis à vérification d&apos;identité et à Stripe Connect.</li>
        </ul>
      </section>

      <section>
        <h2 className="legal-h2">5. Enchères et ventes</h2>
        <p>
          Le vendeur est seul responsable de la description, des photos, de la légalité et de la conformité
          de l&apos;article mis en vente. La vente est conclue entre acheteur et vendeur ; badirty met en relation
          les parties et gère le flux technique (enchères, paiement interne, suivi de commande).
        </p>
        <ul className="legal-list mt-2">
          <li>Une enchère engagée lie l&apos;acheteur si elle est gagnante, sous réserve des règles affichées.</li>
          <li>Le vendeur peut annuler une enchère <strong>sans offre</strong> ; avec des offres, l&apos;annulation est limitée.</li>
          <li>L&apos;acheteur gagnant doit fournir une adresse de livraison dans les délais indiqués.</li>
          <li>Le vendeur doit expédier l&apos;article et peut renseigner un numéro de suivi.</li>
        </ul>
      </section>

      <section>
        <h2 className="legal-h2">6. Contenus interdits</h2>
        <p>Il est strictement interdit de publier, vendre ou promouvoir :</p>
        <ul className="legal-list">
          <li>Tout contenu impliquant des <strong>mineurs</strong> ou paraissant en impliquer ;</li>
          <li>Des objets ou services <strong>illégaux</strong> en France ou dans le pays de livraison ;</li>
          <li>Du contenu non consenti, de la contrefaçon, des armes, drogues, données personnelles tierces ;</li>
          <li>Tout contenu violant les droits d&apos;autrui ou les conditions des prestataires (Stripe, hébergeurs).</li>
        </ul>
        <p className="mt-2">
          badirty se réserve le droit de supprimer tout contenu, suspendre ou fermer un compte, et signaler aux autorités si nécessaire.
        </p>
      </section>

      <section>
        <h2 className="legal-h2">7. Modération et signalements</h2>
        <p>
          Les utilisateurs peuvent signaler une annonce via la fonction dédiée.
          Les signalements sont traités par l&apos;équipe badirty dans un délai raisonnable.
          Aucune modération n&apos;est instantanée : la responsabilité du contenu publié incombe au vendeur.
        </p>
      </section>

      <section>
        <h2 className="legal-h2">8. Responsabilité</h2>
        <p>
          badirty est un intermédiaire technique. Nous ne garantissons pas la qualité, l&apos;authenticité
          ou la livraison des articles vendus par les utilisateurs.
        </p>
        <p className="mt-2">
          Dans les limites autorisées par la loi, badirty ne pourra être tenu responsable des dommages indirects,
          pertes de profit, ou litiges entre utilisateurs. Notre responsabilité est limitée aux montants
          effectivement perçus par badirty au titre des 12 derniers mois, sauf faute lourde ou dol.
        </p>
      </section>

      <section>
        <h2 className="legal-h2">9. Résiliation</h2>
        <p>
          Vous pouvez supprimer votre compte en contactant{' '}
          <a href={`mailto:${contactEmail}`} className="text-accent hover:underline">{contactEmail}</a>.
          badirty peut résilier un compte en cas de violation des CGU, fraude ou risque pour la communauté.
          Les obligations nées avant résiliation (livraisons en cours, litiges) subsistent.
        </p>
      </section>

      <section>
        <h2 className="legal-h2">10. Droit applicable</h2>
        <p>
          Les présentes CGU sont soumises au <strong>droit français</strong>.
          En cas de litige, une solution amiable sera recherchée via le support.
          À défaut, les tribunaux français seront compétents, sous réserve des règles impératives de protection des consommateurs.
        </p>
      </section>

      <p className="text-text-3 text-xs border-t border-white/10 pt-4">
        Document d&apos;information générale — ne remplace pas un conseil juridique personnalisé.
        Pour toute question : <a href={`mailto:${contactEmail}`} className="text-accent hover:underline">{contactEmail}</a>.
      </p>
    </LegalShell>
  );
}