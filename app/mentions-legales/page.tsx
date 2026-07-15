import type { Metadata } from 'next';
import LegalShell from '@/components/legal/LegalShell';
import { SITE_LEGAL } from '@/lib/site-legal';

export const metadata: Metadata = {
  title: 'Mentions légales — badirty',
  description: 'Informations légales du site badirty.fr',
};

export default function MentionsLegalesPage() {
  const { editor, hosts, contactEmail, siteUrl, lastUpdated } = SITE_LEGAL;

  return (
    <LegalShell title="Mentions légales" subtitle={`Dernière mise à jour : ${lastUpdated}`}>
      <section>
        <h2 className="legal-h2">1. Éditeur du site</h2>
        <p>
          Le site <a href={siteUrl} className="text-accent hover:underline">{siteUrl}</a> est édité par :
        </p>
        <ul className="legal-list">
          <li><strong>Dénomination :</strong> {editor.name}</li>
          <li><strong>Forme juridique :</strong> {editor.legalForm}</li>
          <li><strong>Siège :</strong> {editor.address}</li>
          <li><strong>SIRET :</strong> {editor.siret}</li>
          <li><strong>RCS :</strong> {editor.rcs}</li>
          <li><strong>TVA :</strong> {editor.vat}</li>
          <li><strong>Contact :</strong>{' '}
            <a href={`mailto:${contactEmail}`} className="text-accent hover:underline">{contactEmail}</a>
          </li>
          <li><strong>Directeur de la publication :</strong> {editor.director}</li>
        </ul>
      </section>

      <section>
        <h2 className="legal-h2">2. Hébergement</h2>
        <p><strong>Application web :</strong> {hosts.application}</p>
        <p className="mt-2"><strong>Données et authentification :</strong> {hosts.database}</p>
      </section>

      <section>
        <h2 className="legal-h2">3. Objet du service</h2>
        <p>
          badirty est une plateforme en ligne permettant à des utilisateurs majeurs de publier des enchères
          et d&apos;acheter des articles via un système d&apos;enchères en direct et de portefeuille prépayé.
          badirty agit en qualité d&apos;intermédiaire technique entre acheteurs et vendeurs.
        </p>
      </section>

      <section>
        <h2 className="legal-h2">4. Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble des éléments du site (textes, graphismes, logo, structure, code) est protégé par le droit
          de la propriété intellectuelle. Toute reproduction non autorisée est interdite.
        </p>
        <p className="mt-2">
          Les contenus publiés par les utilisateurs (photos, descriptions) restent leur propriété ;
          l&apos;utilisateur accorde à badirty une licence non exclusive pour les afficher sur la plateforme.
        </p>
      </section>

      <section>
        <h2 className="legal-h2">5. Données personnelles</h2>
        <p>
          Le traitement des données personnelles est décrit dans notre{' '}
          <a href="/privacy" className="text-accent hover:underline">politique de confidentialité</a>.
          Pour exercer vos droits RGPD : <a href={`mailto:${contactEmail}`} className="text-accent hover:underline">{contactEmail}</a>.
        </p>
      </section>

      <section>
        <h2 className="legal-h2">6. Médiation et litiges</h2>
        <p>
          En cas de litige avec un autre utilisateur (vente, livraison, paiement), contactez d&apos;abord le support.
          À défaut de résolution amiable, les tribunaux français seront compétents conformément aux CGU.
        </p>
        <p className="mt-2 text-text-3 text-xs">
          Conformément à l&apos;article L.612-1 du Code de la consommation, le consommateur peut recourir
          gratuitement à un médiateur de la consommation. Plateforme de médiation : à désigner si activité B2C élargie.
        </p>
      </section>
    </LegalShell>
  );
}