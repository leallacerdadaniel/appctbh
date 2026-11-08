/**
 * Strings of the "reminders" feature. `en` must mirror `fr` (typed below), and both are mounted
 * in src/i18n/strings.ts as `t.reminders`.
 */
export const fr = {
  title: 'Rappels et agenda',
  subtitle: 'Choisissez ce que l’app vous rappelle et ce qui va dans votre agenda.',

  /* Notification permission */
  permissionTitle: 'Notifications',
  permissionGranted: 'Activées sur ce téléphone',
  permissionDenied: 'Refusées. Activez‑les dans les réglages du téléphone pour recevoir les rappels.',
  permissionUndetermined: 'Pas encore autorisées',
  permissionUnavailable: 'Indisponibles ici. Les rappels marchent sur iPhone et Android.',
  allow: 'Autoriser les notifications',
  openSettings: 'Ouvrir les réglages',

  /* Topics */
  topicsTitle: 'Ce qu’on vous rappelle',
  topicsSubtitle: 'Des notifications sur ce téléphone, même sans ouvrir l’app.',
  topics: {
    rent: 'Loyer',
    cleaning: 'Ménage',
    requests: 'Services et réservations',
    checkout: 'Départ',
    documents: 'Documents',
    chores: 'Tâches de la maison',
  },
  topicHints: {
    rent: '3 jours avant l’échéance et le jour même, avec le montant',
    cleaning: 'La veille de chaque passage, à 19 h',
    requests: 'La veille d’un service, d’une réservation ou d’un changement d’horaire, à 18 h',
    checkout: '7 jours puis 1 jour avant la fin du séjour',
    documents: '30 jours puis 7 jours avant l’expiration',
    chores: 'Le lundi à 9 h, les semaines où c’est votre tour',
  },

  /* Calendar */
  calendarTitle: 'Mon agenda',
  calendarSubtitle:
    'Un agenda « Chez Toi BH » est ajouté à votre téléphone et mis à jour tout seul. Vous pouvez le masquer ou le supprimer à tout moment.',
  calendarToggle: 'Synchroniser avec mon agenda',
  calendarTopics: {
    rent: 'Échéances du loyer',
    cleaning: 'Passages du ménage',
    requests: 'Services et réservations',
    checkout: 'Jour du départ',
    chores: 'Tâches de la maison',
  },
  syncNow: 'Synchroniser maintenant',
  lastSync: (when: string) => `Dernière synchronisation : ${when}`,
  neverSynced: 'Pas encore synchronisé',
  synced: (n: number) => (n === 0 ? 'Agenda à jour' : n === 1 ? '1 événement dans votre agenda' : `${n} événements dans votre agenda`),
  calendarErrors: {
    denied: 'Accès à l’agenda refusé. Autorisez‑le dans les réglages du téléphone.',
    unavailable: 'L’agenda n’est pas disponible sur cet appareil.',
    failed: 'La synchronisation a échoué. Réessayez dans un instant.',
  },
  calendarRemoved: 'Agenda Chez Toi BH retiré du téléphone',
  calendarName: 'Chez Toi BH',

  /* Upcoming */
  upcomingTitle: 'Prochains rappels',
  upcomingSubtitle: 'Les notifications déjà prévues sur ce téléphone.',
  upcomingEmpty: 'Aucun rappel prévu pour le moment.',

  /* Personal reminders */
  personalTitle: 'Mes rappels',
  personalSubtitle: 'Un rappel à vous, à la date et à l’heure de votre choix.',
  personalLabel: 'Me rappeler de',
  personalPlaceholder: 'Acheter du gaz, appeler la banque',
  personalDay: 'Quel jour',
  personalTime: 'À quelle heure',
  personalAdd: 'Ajouter le rappel',
  personalDelete: (title: string) => `Supprimer le rappel ${title}`,
  personalAdded: 'Rappel ajouté',
  personalNeedsPermission: 'Autorisez les notifications pour recevoir ce rappel.',
  personalPast: 'Choisissez un moment à venir.',
  personalBody: 'Votre rappel Chez Toi BH',
  today: 'Aujourd’hui',
  tomorrow: 'Demain',

  /* Notification texts */
  notif: {
    rentSoonTitle: 'Loyer dans 3 jours',
    rentTodayTitle: 'Loyer à payer aujourd’hui',
    rentBody: (amount: string, date: string) => `${amount} à payer le ${date}. Le Pix est dans l’app.`,
    cleaningTitle: 'Ménage demain',
    cleaningBody: (time: string) => `Passage à ${time}. Rangez vos affaires pour faciliter le ménage.`,
    requestTitle: (what: string) => `Demain : ${what}`,
    requestBody: (time: string) => `Prévu à ${time}.`,
    lateCheckout: 'Départ tardif',
    earlyCheckin: 'Arrivée anticipée',
    gourmet: 'Espace gourmet réservé',
    gourmetBody: (start: string, end: string) => `De ${start} à ${end}. Laissez l’espace propre.`,
    service: 'Service',
    checkoutWeekTitle: 'Départ dans 7 jours',
    checkoutDayTitle: 'Départ demain',
    checkoutBody: (date: string, time: string) =>
      `Fin du séjour le ${date}, départ avant ${time}. Préparez l’état des lieux.`,
    documentTitle: (doc: string, days: number) => `${doc} : expire dans ${days} jours`,
    documentBody: (date: string) => `Expire le ${date}. Renouvelez‑le et envoyez la nouvelle version dans l’app.`,
    documents: {
      passport: 'Passeport',
      visa: 'Visa',
      rnm: 'RNM',
      cpf: 'CPF',
      insurance: 'Assurance',
      enrollment: 'Certificat de scolarité',
    },
    choresTitle: 'Vos tâches cette semaine',
    choresBody: (list: string) => `C’est votre tour : ${list}.`,
  },

  /* Calendar event titles */
  event: {
    rent: (amount: string) => `Loyer Chez Toi : ${amount}`,
    cleaning: 'Ménage de l’appartement',
    checkout: 'Départ de l’appartement',
    checkoutNotes: (time: string) => `Rendre les clés avant ${time}.`,
    chores: (list: string) => `Mes tâches : ${list}`,
  },

  /* Notices (the bell) */
  noticesTitle: 'Notifications',
  noticesSubtitle: 'Les messages de l’équipe Chez Toi et les suivis de vos demandes.',
  noticesEmpty: 'Rien de nouveau pour le moment.',
  noticesEmptyHint: 'Les réponses de l’équipe et les annonces de l’immeuble apparaîtront ici.',
  bellLabel: (n: number) => (n === 0 ? 'Notifications' : n === 1 ? 'Notifications, 1 non lue' : `Notifications, ${n} non lues`),
  unread: 'Non lu',
  ago: {
    now: 'À l’instant',
    minutes: (n: number) => `Il y a ${n} min`,
    hours: (n: number) => `Il y a ${n} h`,
    yesterday: 'Hier',
    days: (n: number) => `Il y a ${n} jours`,
  },
};

export const en: typeof fr = {
  title: 'Reminders and calendar',
  subtitle: 'Choose what the app reminds you of and what goes in your calendar.',

  permissionTitle: 'Notifications',
  permissionGranted: 'On for this phone',
  permissionDenied: 'Turned off. Turn them on in the phone settings to get reminders.',
  permissionUndetermined: 'Not allowed yet',
  permissionUnavailable: 'Not available here. Reminders work on iPhone and Android.',
  allow: 'Allow notifications',
  openSettings: 'Open settings',

  topicsTitle: 'What we remind you of',
  topicsSubtitle: 'Notifications on this phone, even when the app is closed.',
  topics: {
    rent: 'Rent',
    cleaning: 'Cleaning',
    requests: 'Services and bookings',
    checkout: 'Move‑out',
    documents: 'Documents',
    chores: 'House chores',
  },
  topicHints: {
    rent: '3 days before the due date and on the day, with the amount',
    cleaning: 'The evening before each visit, at 7 pm',
    requests: 'The day before a service, a booking or a time change, at 6 pm',
    checkout: '7 days and then 1 day before your stay ends',
    documents: '30 days and then 7 days before they expire',
    chores: 'Mondays at 9 am, on the weeks it is your turn',
  },

  calendarTitle: 'My calendar',
  calendarSubtitle:
    'A “Chez Toi BH” calendar is added to your phone and kept up to date. You can hide or delete it at any time.',
  calendarToggle: 'Sync with my calendar',
  calendarTopics: {
    rent: 'Rent due dates',
    cleaning: 'Cleaning visits',
    requests: 'Services and bookings',
    checkout: 'Move‑out day',
    chores: 'House chores',
  },
  syncNow: 'Sync now',
  lastSync: (when: string) => `Last synced: ${when}`,
  neverSynced: 'Not synced yet',
  synced: (n: number) => (n === 0 ? 'Calendar up to date' : n === 1 ? '1 event in your calendar' : `${n} events in your calendar`),
  calendarErrors: {
    denied: 'Calendar access denied. Allow it in the phone settings.',
    unavailable: 'The calendar is not available on this device.',
    failed: 'Sync failed. Try again in a moment.',
  },
  calendarRemoved: 'Chez Toi BH calendar removed from the phone',
  calendarName: 'Chez Toi BH',

  upcomingTitle: 'Upcoming reminders',
  upcomingSubtitle: 'Notifications already planned on this phone.',
  upcomingEmpty: 'No reminders planned for now.',

  personalTitle: 'My reminders',
  personalSubtitle: 'A reminder of your own, on the day and at the time you choose.',
  personalLabel: 'Remind me to',
  personalPlaceholder: 'Buy gas, call the bank',
  personalDay: 'Which day',
  personalTime: 'What time',
  personalAdd: 'Add reminder',
  personalDelete: (title: string) => `Delete reminder ${title}`,
  personalAdded: 'Reminder added',
  personalNeedsPermission: 'Allow notifications to get this reminder.',
  personalPast: 'Pick a time in the future.',
  personalBody: 'Your Chez Toi BH reminder',
  today: 'Today',
  tomorrow: 'Tomorrow',

  notif: {
    rentSoonTitle: 'Rent due in 3 days',
    rentTodayTitle: 'Rent due today',
    rentBody: (amount: string, date: string) => `${amount} to pay on ${date}. The Pix key is in the app.`,
    cleaningTitle: 'Cleaning tomorrow',
    cleaningBody: (time: string) => `Visit at ${time}. Tidy up your things to make the cleaning easier.`,
    requestTitle: (what: string) => `Tomorrow: ${what}`,
    requestBody: (time: string) => `Planned at ${time}.`,
    lateCheckout: 'Late check‑out',
    earlyCheckin: 'Early check‑in',
    gourmet: 'Gourmet space booked',
    gourmetBody: (start: string, end: string) => `From ${start} to ${end}. Leave the space clean.`,
    service: 'Service',
    checkoutWeekTitle: 'Move‑out in 7 days',
    checkoutDayTitle: 'Move‑out tomorrow',
    checkoutBody: (date: string, time: string) =>
      `Your stay ends on ${date}, check‑out before ${time}. Get ready for the inspection.`,
    documentTitle: (doc: string, days: number) => `${doc}: expires in ${days} days`,
    documentBody: (date: string) => `Expires on ${date}. Renew it and upload the new version in the app.`,
    documents: {
      passport: 'Passport',
      visa: 'Visa',
      rnm: 'RNM',
      cpf: 'CPF',
      insurance: 'Insurance',
      enrollment: 'Enrollment certificate',
    },
    choresTitle: 'Your chores this week',
    choresBody: (list: string) => `It is your turn: ${list}.`,
  },

  event: {
    rent: (amount: string) => `Chez Toi rent: ${amount}`,
    cleaning: 'Apartment cleaning',
    checkout: 'Move‑out',
    checkoutNotes: (time: string) => `Hand the keys back before ${time}.`,
    chores: (list: string) => `My chores: ${list}`,
  },

  noticesTitle: 'Notifications',
  noticesSubtitle: 'Messages from the Chez Toi team and updates on your requests.',
  noticesEmpty: 'Nothing new for now.',
  noticesEmptyHint: 'Replies from the team and building announcements will show up here.',
  bellLabel: (n: number) => (n === 0 ? 'Notifications' : n === 1 ? 'Notifications, 1 unread' : `Notifications, ${n} unread`),
  unread: 'Unread',
  ago: {
    now: 'Just now',
    minutes: (n: number) => `${n} min ago`,
    hours: (n: number) => `${n} h ago`,
    yesterday: 'Yesterday',
    days: (n: number) => `${n} days ago`,
  },
};
