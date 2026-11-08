/**
 * Strings of the "house" feature: the apartment hub and its sub-pages (rules, inventory,
 * documents, deposit, Wi‑Fi). `en` must mirror `fr` (typed below), and both are mounted in
 * src/i18n/strings.ts as `t.house`.
 */
export const fr = {
  /* Hub */
  connectWifi: 'Se connecter',
  wifiJoined: (ssid: string) => `Connecté à ${ssid}`,
  wifiCopied: (ssid: string) => `Mot de passe copié : choisissez ${ssid} dans les réglages Wi‑Fi`,
  myHome: 'Mon logement',
  myHomeHint: 'Facture, demandes et papiers',
  homeLife: 'Vie à la maison',
  homeLifeHint: 'Avec vos colocataires',
  requests: 'Demandes',
  requestsStatus: (n: number) =>
    n === 0 ? 'Aucune demande en cours' : n === 1 ? '1 demande en cours' : `${n} demandes en cours`,
  rules: 'Règles',
  rulesStatus: (n: number) => `${n} règles à connaître`,
  inventory: 'Inventaire',
  inventoryStatus: (date: string) => `État des lieux du ${date}`,
  documents: 'Documents',
  documentsStatus: (missing: number) =>
    missing === 0 ? 'Tout est envoyé' : missing === 1 ? '1 document manquant' : `${missing} documents manquants`,
  chores: 'Tâches',
  choresStatus: (names: string) => `Cette semaine : ${names}`,
  choresNone: 'Rien pour vous cette semaine',
  expenses: 'Dépenses',
  balanceOwed: (amount: string) => `On vous doit ${amount}`,
  balanceOwe: (amount: string) => `Vous devez ${amount}`,
  balanceSettled: 'Tout est réglé',

  /* Rules */
  rulesTitle: 'Règles de la maison',
  rulesSubtitle: 'Pour bien vivre ensemble et avec les voisins',
  rulesIntro:
    'Ces règles viennent du contrat et du règlement de l’immeuble. En cas de doute, demandez à l’équipe Chez Toi.',
  apartmentRules: 'Dans l’appartement',
  apartmentRulesHint: 'Entre colocataires',
  buildingRules: 'Dans l’immeuble',
  buildingRulesHint: 'Règlement du syndic',

  /* Inventory */
  inventoryTitle: 'Inventaire et état des lieux',
  inventorySubtitle: 'Ce qui est dans l’appartement et dans quel état',
  inspection: 'État des lieux d’entrée',
  inspectionOut: 'État des lieux de sortie',
  inspectionDate: 'Date',
  signedBy: 'Signé par',
  photos: 'Photos',
  photoCount: (n: number) => `${n} photos`,
  pdfLater: 'PDF disponible après la connexion',
  byRoom: 'Par pièce',
  byRoomHint: 'Quantité et état à l’entrée',
  condition: {
    new: 'Neuf',
    good: 'Bon état',
    worn: 'Usé',
    damaged: 'Abîmé',
  },
  quantity: (n: number) => `× ${n}`,
  reportProblem: 'Signaler un problème',
  reportHint: 'Quelque chose est cassé ou manque ? L’équipe s’en occupe.',

  /* Documents */
  documentsTitle: 'Mes documents',
  documentsSubtitle: 'Les papiers que Chez Toi garde pour votre séjour',
  privacy: 'Vos documents ne sont vus que par l’équipe Chez Toi.',
  docType: {
    passport: 'Passeport',
    visa: 'Visa',
    rnm: 'RNM',
    cpf: 'CPF',
    insurance: 'Assurance santé',
    enrollment: 'Certificat de scolarité',
  },
  docStatus: {
    missing: 'Manquant',
    sent: 'Envoyé, en vérification',
    validated: 'Validé',
  },
  number: (n: string) => `N° ${n}`,
  expires: (date: string) => `Expire le ${date}`,
  expiresSoon: (date: string, days: number) =>
    days <= 0 ? `Expiré le ${date}` : days === 1 ? `Expire demain (${date})` : `Expire dans ${days} jours (${date})`,
  send: 'Envoyer',
  replace: 'Remplacer',
  sent: (doc: string) => `${doc} envoyé à l’équipe`,
  pickError: 'Impossible d’envoyer le fichier. Réessayez.',
  deposit: 'Caution',
  depositHint: 'Rendue après l’état des lieux de sortie',
  depositBody: (amount: string) =>
    `Votre caution de ${amount} vous est rendue après l’état des lieux de sortie, déduction faite des éventuels dégâts.`,
};

export const en: typeof fr = {
  /* Hub */
  connectWifi: 'Connect',
  wifiJoined: (ssid: string) => `Connected to ${ssid}`,
  wifiCopied: (ssid: string) => `Password copied: pick ${ssid} in your Wi‑Fi settings`,
  myHome: 'My home',
  myHomeHint: 'Bill, requests and papers',
  homeLife: 'Home life',
  homeLifeHint: 'With your roommates',
  requests: 'Requests',
  requestsStatus: (n: number) =>
    n === 0 ? 'No open requests' : n === 1 ? '1 open request' : `${n} open requests`,
  rules: 'Rules',
  rulesStatus: (n: number) => `${n} rules to know`,
  inventory: 'Inventory',
  inventoryStatus: (date: string) => `Inspection of ${date}`,
  documents: 'Documents',
  documentsStatus: (missing: number) =>
    missing === 0 ? 'Everything sent' : missing === 1 ? '1 document missing' : `${missing} documents missing`,
  chores: 'Chores',
  choresStatus: (names: string) => `This week: ${names}`,
  choresNone: 'Nothing for you this week',
  expenses: 'Expenses',
  balanceOwed: (amount: string) => `You are owed ${amount}`,
  balanceOwe: (amount: string) => `You owe ${amount}`,
  balanceSettled: 'All settled',

  /* Rules */
  rulesTitle: 'House rules',
  rulesSubtitle: 'To live well together and with the neighbours',
  rulesIntro:
    'These rules come from the contract and the building rules. If in doubt, ask the Chez Toi team.',
  apartmentRules: 'In the apartment',
  apartmentRulesHint: 'Between roommates',
  buildingRules: 'In the building',
  buildingRulesHint: 'Building management rules',

  /* Inventory */
  inventoryTitle: 'Inventory and inspection',
  inventorySubtitle: 'What is in the apartment and its condition',
  inspection: 'Move‑in inspection',
  inspectionOut: 'Move‑out inspection',
  inspectionDate: 'Date',
  signedBy: 'Signed by',
  photos: 'Photos',
  photoCount: (n: number) => `${n} photos`,
  pdfLater: 'PDF available after sign‑in',
  byRoom: 'By room',
  byRoomHint: 'Quantity and condition at move‑in',
  condition: {
    new: 'New',
    good: 'Good',
    worn: 'Worn',
    damaged: 'Damaged',
  },
  quantity: (n: number) => `× ${n}`,
  reportProblem: 'Report a problem',
  reportHint: 'Something broken or missing? The team takes care of it.',

  /* Documents */
  documentsTitle: 'My documents',
  documentsSubtitle: 'The papers Chez Toi keeps for your stay',
  privacy: 'Your documents are only seen by the Chez Toi team.',
  docType: {
    passport: 'Passport',
    visa: 'Visa',
    rnm: 'RNM',
    cpf: 'CPF',
    insurance: 'Health insurance',
    enrollment: 'Enrollment certificate',
  },
  docStatus: {
    missing: 'Missing',
    sent: 'Sent, being checked',
    validated: 'Validated',
  },
  number: (n: string) => `No. ${n}`,
  expires: (date: string) => `Expires on ${date}`,
  expiresSoon: (date: string, days: number) =>
    days <= 0 ? `Expired on ${date}` : days === 1 ? `Expires tomorrow (${date})` : `Expires in ${days} days (${date})`,
  send: 'Send',
  replace: 'Replace',
  sent: (doc: string) => `${doc} sent to the team`,
  pickError: 'Could not send the file. Try again.',
  deposit: 'Deposit',
  depositHint: 'Returned after the move‑out inspection',
  depositBody: (amount: string) =>
    `Your ${amount} deposit is returned after the move‑out inspection, minus any damage.`,
};
