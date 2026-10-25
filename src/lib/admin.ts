import type { Localized } from '@/lib/mock-data';

/**
 * "Démarches administratives": CPF and migration registration (RNM/CRNM), written from the official pages
 * (checked 2026-10-24): gov.br "Inscrever no CPF", gov.br "Registrar-se como Estrangeiro no Brasil",
 * the PF's document list "Registro de imigrante detentor de visto temporário" (updated 07/08/2026),
 * the PF's page on residence authorization for study, and the SR/PF/MG page for the BH office (updated 23/10/2026).
 * No fees in reais on purpose: they change (owner's rule). Rules change too, so each page says where to
 * confirm them and the source line carries the date.
 */

export type AdminId = 'cpf' | 'rnm';

const L = (fr: string, en: string): Localized => ({ fr, en });

type Step = { title: Localized; body: Localized };

type Office = {
  name: Localized;
  address: string;
  phone?: string;
  hours?: Localized;
  note?: Localized;
  /** Google place, only used for the directions button. */
  placeId: string;
  mapsName: string;
};

export type AdminProcedure = {
  id: AdminId;
  title: string;
  kind: Localized;
  summary: Localized;
  /** The one thing not to miss (deadline, cost rule). */
  notice: Localized;
  steps: Step[];
  documentsTitle: Localized;
  documents: Localized[];
  documentsNote?: Localized;
  office: Office;
  links: { label: Localized; url: string }[];
  tip: Localized;
  /** Extra search words (both languages). */
  keywords: string[];
};

export const adminProcedures: AdminProcedure[] = [
  {
    id: 'cpf',
    title: 'CPF',
    kind: L('Numéro fiscal brésilien', 'Brazilian tax number'),
    summary: L(
      'Le CPF est votre numéro d’identification fiscale au Brésil. Beaucoup de services le demandent : applis de livraison, achats en ligne, banques numériques.',
      'The CPF is your tax ID number in Brazil. Many services ask for it: delivery apps, online shopping, digital banks.',
    ),
    notice: L(
      'L’inscription est gratuite à la Receita Federal. Les points partenaires (Correios, Banco do Brasil, Caixa, cartórios) la proposent aussi, mais font payer une petite taxe.',
      'Registration is free at the Receita Federal. Partner points (Correios, Banco do Brasil, Caixa, cartórios) offer it too, but charge a small fee.',
    ),
    steps: [
      {
        title: L('Choisissez où faire la demande', 'Choose where to apply'),
        body: L(
          'Selon le site officiel, quatre options : un guichet de la Receita Federal, un point partenaire, une demande par e-mail (avec une photo de vous tenant votre pièce d’identité près du visage), ou le formulaire en ligne « Inscrever Estrangeiro no CPF » sur gov.br. En ligne, si le formulaire génère un protocole, il faut ensuite présenter ce protocole et vos documents à la Receita Federal.',
          'The official site lists four options: a Receita Federal counter, a partner point, a request by e-mail (with a photo of you holding your ID next to your face), or the online form “Inscrever Estrangeiro no CPF” on gov.br. Online, if the form generates a protocol, you then have to present it with your documents to the Receita Federal.',
        ),
      },
      {
        title: L('Préparez votre passeport', 'Have your passport ready'),
        body: L(
          'C’est la pièce d’identité demandée. Le guichet peut aussi vous demander d’autres documents.',
          'It is the ID document asked for. The counter may also ask for other documents.',
        ),
      },
      {
        title: L('Faites la demande', 'Make the request'),
        body: L(
          'Au guichet, comptez jusqu’à 15 minutes d’attente, puis environ 5 minutes pour l’inscription. Par e-mail, la réponse prend en moyenne 48 heures.',
          'At the counter, allow up to 15 minutes of waiting, then about 5 minutes for the registration. By e-mail, the answer takes 48 hours on average.',
        ),
      },
      {
        title: L('Gardez la preuve', 'Keep the proof'),
        body: L(
          'Notez votre numéro de CPF. Le comprovante d’inscription s’obtient sur gov.br, avec le service « Obter comprovante de inscrição no CPF ».',
          'Write down your CPF number. The registration certificate (comprovante) is available on gov.br, with the service “Obter comprovante de inscrição no CPF”.',
        ),
      },
    ],
    documentsTitle: L('Documents', 'Documents'),
    documents: [
      L('Passeport (pièce d’identité officielle avec photo)', 'Passport (official photo ID)'),
      L(
        'Acte de naissance ou de mariage (ou équivalent étranger), seulement si votre pièce d’identité n’indique pas la date et le lieu de naissance et la filiation',
        'Birth or marriage certificate (or foreign equivalent), only if your ID does not show date and place of birth and parentage',
      ),
    ],
    office: {
      name: L('Receita Federal à Belo Horizonte', 'Receita Federal in Belo Horizonte'),
      address: 'Av. Olegário Maciel, 2360 - Santo Agostinho, Belo Horizonte - MG, 30180-112',
      note: L(
        'Vérifiez sur le site de la Receita Federal, avant d’y aller, si un rendez-vous est nécessaire et quels sont les horaires.',
        'Before going, check on the Receita Federal website whether an appointment is needed and the opening hours.',
      ),
      placeId: 'ChIJRzYN6uWZpgARf0Qxs8EXy08',
      mapsName: 'Receita Federal do Brasil em Belo Horizonte',
    },
    links: [
      {
        label: L('Inscription au CPF (gov.br)', 'CPF registration (gov.br)'),
        url: 'https://www.gov.br/pt-br/servicos/inscrever-no-cpf',
      },
      {
        label: L('Obtenir le comprovante du CPF (gov.br)', 'Get the CPF certificate (gov.br)'),
        url: 'https://www.gov.br/pt-br/servicos/obter-cartao-de-cpf',
      },
    ],
    tip: L(
      'Faites le CPF en premier : il est demandé par la plupart des applis et, avec le RNM, pour ouvrir un compte dans une banque numérique.',
      'Do the CPF first: most apps ask for it and, with the RNM, so do digital banks.',
    ),
    keywords: ['cpf', 'cadastro de pessoas fisicas', 'receita federal', 'numero fiscal', 'tax number', 'tax id', 'impots'],
  },
  {
    id: 'rnm',
    title: 'RNM',
    kind: L('Registre migratoire · Polícia Federal', 'Migration registration · Federal Police'),
    summary: L(
      'Si vous êtes entré au Brésil avec un visa temporaire, comme un visa d’étudiant, vous devez vous enregistrer auprès de la Polícia Federal. Vous recevez la carte du registre migratoire (CRNM, souvent appelée RNM).',
      'If you entered Brazil on a temporary visa, such as a student visa, you must register with the Polícia Federal. You then receive the migration registration card (CRNM, often called RNM).',
    ),
    notice: L(
      'Vous avez 90 jours après votre entrée au Brésil pour vous enregistrer. Après ce délai, des sanctions sont possibles. Avec une autorisation de résidence publiée au Diário Oficial, le délai est de 30 jours. Prenez rendez-vous dès votre arrivée.',
      'You have 90 days after entering Brazil to register. After that, penalties are possible. With a residence authorization published in the Diário Oficial, the deadline is 30 days. Book your appointment as soon as you arrive.',
    ),
    steps: [
      {
        title: L('Remplissez le formulaire en ligne', 'Fill in the online form'),
        body: L(
          'Sur le site de la Polícia Federal : le formulaire prend environ 20 minutes. Il faut aussi payer la taxe d’émission de la carte, par boleto (GRU) ; le montant est indiqué sur le site de la PF.',
          'On the Polícia Federal website: the form takes about 20 minutes. You also pay the card fee by boleto (GRU); the amount is shown on the PF website.',
        ),
      },
      {
        title: L('Prenez rendez-vous', 'Book an appointment'),
        body: L(
          'Le rendez-vous est gratuit et se prend en ligne, dans l’Agenda Web de la Polícia Federal. Il a lieu à l’unité de la PF de votre ville.',
          'The appointment is free and booked online, in the Polícia Federal’s Agenda Web. It takes place at the PF unit of your city.',
        ),
      },
      {
        title: L('Allez au rendez-vous', 'Go to the appointment'),
        body: L(
          'À Belo Horizonte, c’est l’unité de registre des étrangers, au Ponteio Lar Shopping. Apportez les documents de la liste ci-dessous. Comptez environ 30 minutes.',
          'In Belo Horizonte, it is the foreigners’ registration unit at Ponteio Lar Shopping. Bring the documents listed below. Allow about 30 minutes.',
        ),
      },
      {
        title: L('Récupérez votre carte', 'Collect your card'),
        body: L(
          'La carte met environ 30 jours ouvrés à être fabriquée, et jusqu’à 180 jours au total selon l’estimation officielle. Le site de la PF indique quand elle est prête. Selon l’unité, un second rendez-vous peut être demandé pour la retirer.',
          'The card takes about 30 business days to be made, and up to 180 days in total according to the official estimate. The PF website shows when it is ready. Depending on the unit, a second appointment may be needed to collect it.',
        ),
      },
    ],
    documentsTitle: L('Documents (titulaire d’un visa temporaire)', 'Documents (temporary visa holders)'),
    documents: [
      L('Formulaire de demande rempli en ligne sur le site de la PF', 'Application form filled in online on the PF website'),
      L(
        'Passeport valide (ou autre document prouvant votre identité et votre nationalité)',
        'Valid passport (or another document proving your identity and nationality)',
      ),
      L('Formulaire original du visa', 'Original visa form'),
      L(
        'Preuve de paiement de la taxe d’émission de la carte (GRU), quand elle s’applique',
        'Proof of payment of the card fee (GRU), when it applies',
      ),
      L(
        'Une photo 3x4 récente, en couleur, de face sur fond blanc : seulement si la prise biométrique de la PF est indisponible',
        'A recent 3x4 colour photo, front-facing on a white background: only if the PF’s biometric system is unavailable',
      ),
    ],
    documentsNote: L(
      'La PF peut demander d’autres documents selon le cas, par exemple un acte de naissance ou de mariage récent. Les documents étrangers doivent respecter les règles de légalisation et de traduction. Sans visa temporaire, la démarche est différente (autorisation de résidence pour études) et demande plus de documents : voir les liens officiels.',
      'The PF may ask for other documents depending on the case, for example a recent birth or marriage certificate. Foreign documents must follow the legalization and translation rules. Without a temporary visa, the procedure is different (residence authorization for study) and needs more documents: see the official links.',
    ),
    office: {
      name: L('Polícia Federal · registre des étrangers', 'Polícia Federal · foreigners’ registration'),
      address: 'Ponteio Lar Shopping, Rodovia BR-356, 2.500, 1º piso, loja 120D - Santa Lúcia, Belo Horizonte - MG, 30320-901',
      phone: '+55 31 2517-9900',
      hours: L(
        'Du lundi au vendredi, de 8h05 à 16h30, uniquement sur rendez-vous en ligne',
        'Monday to Friday, 8:05 am to 4:30 pm, by online appointment only',
      ),
      placeId: 'ChIJZxKpDk6ZpgARkX7IPOZBggM',
      mapsName: 'Polícia Federal Ponteio Lar Shopping',
    },
    links: [
      {
        label: L('Immigration : site de la PF (rendez-vous)', 'Immigration: PF website (appointments)'),
        url: 'https://www.gov.br/pf/pt-br/assuntos/imigracao/inicio',
      },
      {
        label: L('Agenda Web de la PF', 'PF Agenda Web'),
        url: 'https://servicos.pf.gov.br/agenda-web/acessar',
      },
      {
        label: L('Se faire enregistrer comme étranger (gov.br)', 'Register as a foreigner (gov.br)'),
        url: 'https://www.gov.br/pt-br/servicos/registrar-se-como-estrangeiro-no-brasil',
      },
      {
        label: L('Documents : titulaire d’un visa temporaire (PF)', 'Documents: temporary visa holders (PF)'),
        url: 'https://www.gov.br/pf/pt-br/assuntos/imigracao/registrar-se-como-estrangeiro-no-brasil/registro-de-imigrante-detentor-de-visto',
      },
      {
        label: L('Sans visa : autorisation de résidence pour études (PF)', 'Without a visa: residence authorization for study (PF)'),
        url: 'https://www.gov.br/pf/pt-br/assuntos/imigracao/autorizacao-residencia/autorizacao-de-residencia-para-fins-de-estudo',
      },
    ],
    tip: L(
      'Les banques numériques demandent en général le CPF et le RNM : commencez les deux démarches dès votre arrivée. En cas de doute sur votre situation (visa, délai), demandez à votre école ou à la Polícia Federal.',
      'Digital banks usually ask for both the CPF and the RNM: start both as soon as you arrive. If you are unsure about your situation (visa, deadline), ask your school or the Polícia Federal.',
    ),
    keywords: [
      'rnm',
      'crnm',
      'registro nacional migratorio',
      'policia federal',
      'pf',
      'visa',
      'visto',
      'carte de sejour',
      'residence permit',
      'immigration',
      'etranger',
      'foreigner',
      'passeport',
      'passport',
    ],
  },
];

export function getAdminProcedure(id: string) {
  return adminProcedures.find((p) => p.id === id);
}

export function adminMapsUrl(o: Office) {
  const params = new URLSearchParams({ api: '1', query: o.mapsName, query_place_id: o.placeId });
  return `https://www.google.com/maps/search/?${params}`;
}
