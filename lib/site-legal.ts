/** Informations légales — complète les champs [À compléter] avant une promo à grande échelle. */
export const SITE_LEGAL = {
  siteName: 'badirty',
  siteUrl: 'https://badirty.fr',
  contactEmail: 'support@badirty.fr',
  lastUpdated: '15 juillet 2026',
  editor: {
    name: 'badirty',
    legalForm: 'Entrepreneur individuel',
    address: 'France',
    siret: 'En cours d\'immatriculation',
    rcs: 'Non applicable',
    vat: 'Non applicable, art. 293 B du CGI',
    director: 'Le responsable de publication',
  },
  hosts: {
    application: 'Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis',
    database: 'Supabase Inc. (infrastructure hébergée dans l\'Union européenne)',
  },
  processors: [
    { name: 'Supabase', role: 'Authentification, base de données, stockage' },
    { name: 'Stripe', role: 'Paiements et portefeuille' },
    { name: 'Resend', role: 'Envoi d\'e-mails transactionnels' },
    { name: 'Vercel', role: 'Hébergement de l\'application' },
  ],
} as const;