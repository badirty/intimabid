import type { Metadata } from 'next';
import LegalShell from '@/components/legal/LegalShell';
import { SITE_LEGAL } from '@/lib/site-legal';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — badirty',
  description: 'Protection des données personnelles (RGPD) — badirty',
};

export default function PrivacyPage() {
  const { contactEmail, processors, lastUpdated, siteName } = SITE_LEGAL;

  return (
    <LegalShell title="Politique de confidentialité" subtitle={`Dernière mise à jour : ${lastUpdated} — RGPD`}>
      <p>
        {siteName} s&apos;engage à protéger vos données personnelles conformément au Règlement général
        sur la protection des données (RGPD) et à la loi Informatique et Libertés.
      </p>

      <section>
        <h2 className="legal-h2">1. Responsable du traitement</h2>
        <p>
          Le responsable du traitement est l&apos;éditeur du site badirty.fr.
          Contact données personnelles :{' '}
          <a href={`mailto:${contactEmail}`} className="text-accent hover:underline">{contactEmail}</a>.
        </p>
      </section>

      <section>
        <h2 className="legal-h2">2. Données collectées</h2>
        <ul className="legal-list">
          <li><strong>Compte :</strong> adresse e-mail, identifiant OAuth, pseudo, photo de profil (OAuth), bio optionnelle ;</li>
          <li><strong>Activité :</strong> enchères, offres, favoris, notifications, commandes, adresse de livraison ;</li>
          <li><strong>Paiements :</strong> historique de recharges et transactions portefeuille (les données bancaires sont traitées par Stripe, pas stockées par badirty) ;</li>
          <li><strong>Technique :</strong> logs de connexion, adresse IP, cookies de session strictement nécessaires ;</li>
          <li><strong>Modération :</strong> signalements et échanges avec le support.</li>
        </ul>
        <p className="mt-2">
          <strong>Non collecté volontairement :</strong> numéro de téléphone (sauf si un prestataire de paiement le transmet à Stripe pour facturation — non affiché sur badirty).
        </p>
      </section>

      <section>
        <h2 className="legal-h2">3. Finalités et bases légales</h2>
        <ul className="legal-list">
          <li><strong>Exécution du contrat</strong> — création de compte, enchères, achats, livraisons ;</li>
          <li><strong>Obligation légale</strong> — conservation de certaines données comptables/fiscales ;</li>
          <li><strong>Intérêt légitime</strong> — sécurité, lutte contre la fraude, modération ;</li>
          <li><strong>Consentement</strong> — confirmation 18+, affichage public optionnel de la bio.</li>
        </ul>
      </section>

      <section>
        <h2 className="legal-h2">4. Durée de conservation</h2>
        <ul className="legal-list">
          <li>Compte actif : données conservées tant que le compte existe ;</li>
          <li>Après suppression : anonymisation ou suppression sous 3 ans, sauf obligation légale plus longue ;</li>
          <li>Transactions et facturation : jusqu&apos;à 10 ans (obligations comptables) ;</li>
          <li>Logs techniques : jusqu&apos;à 12 mois.</li>
        </ul>
      </section>

      <section>
        <h2 className="legal-h2">5. Destinataires et sous-traitants</h2>
        <p>Vos données peuvent être traitées par :</p>
        <ul className="legal-list">
          {processors.map((p) => (
            <li key={p.name}><strong>{p.name}</strong> — {p.role}</li>
          ))}
        </ul>
        <p className="mt-2">
          Certains sous-traitants sont situés hors UE (ex. Vercel, Stripe) avec des garanties appropriées
          (clauses contractuelles types, Privacy Shield successeurs ou mesures équivalentes).
        </p>
        <p className="mt-2">Nous ne vendons pas vos données personnelles à des tiers.</p>
      </section>

      <section>
        <h2 className="legal-h2">6. Vos droits</h2>
        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul className="legal-list">
          <li>Accès, rectification, effacement ;</li>
          <li>Limitation et opposition au traitement ;</li>
          <li>Portabilité (données fournies par vous) ;</li>
          <li>Retrait du consentement (sans affecter la licéité du traitement antérieur).</li>
        </ul>
        <p className="mt-2">
          Exercez vos droits à :{' '}
          <a href={`mailto:${contactEmail}`} className="text-accent hover:underline">{contactEmail}</a>
          {' '}(réponse sous 30 jours). Pièce d&apos;identité pourra être demandée en cas de doute.
        </p>
        <p className="mt-2">
          Réclamation auprès de la CNIL :{' '}
          <a href="https://www.cnil.fr" className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>.
        </p>
      </section>

      <section>
        <h2 className="legal-h2">7. Sécurité</h2>
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles appropriées :
          chiffrement HTTPS, authentification sécurisée, politiques d&apos;accès (RLS) sur la base de données,
          clés API stockées côté serveur uniquement.
        </p>
      </section>

      <section>
        <h2 className="legal-h2">8. Cookies</h2>
        <p>
          badirty utilise des cookies et stockages locaux <strong>strictement nécessaires</strong> au fonctionnement
          (session de connexion, préférences). Aucun cookie publicitaire tiers n&apos;est déployé par défaut.
          Si des outils d&apos;analytics sont ajoutés ultérieurement, cette politique sera mise à jour et,
          le cas échéant, un bandeau de consentement sera affiché.
        </p>
      </section>

      <section>
        <h2 className="legal-h2">9. Mineurs</h2>
        <p>
          Le service n&apos;est pas destiné aux personnes de moins de 18 ans.
          Toute donnée concernant un mineur sera supprimée dès détection.
        </p>
      </section>

      <section>
        <h2 className="legal-h2">10. Modifications</h2>
        <p>
          Cette politique peut être mise à jour. La date en tête de page indique la dernière révision.
          En cas de changement substantiel, les utilisateurs seront informés par e-mail ou notification in-app.
        </p>
      </section>
    </LegalShell>
  );
}