import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import type { IconName } from '@/components/icon';
import type { Localized } from '@/lib/mock-data';

/**
 * "On m'a volé mon téléphone" (owner, 2026-11-08: "pensar somente em como o cara vai usar isso sem o
 * telefone"). The victim has no phone, so everything here is done on a roommate's phone or a computer.
 *
 * Every fact comes from an official page, listed in each step's `sources` (all checked 2026-11-08):
 * Apple and Google help, the federal Celular Seguro program (MJSP), Anatel, the Minas Gerais government
 * (Delegacia Virtual, Cbloc), the operators' own help pages, WhatsApp help, the Banco Central's Pix FAQ,
 * service-public.gouv.fr and Les clés de la banque. Rules change: re-check the sources each semester.
 */

const L = (fr: string, en: string): Localized => ({ fr, en });

/** A button under a paragraph: open an official page, or call a number. */
export type StepLink =
  | { kind: 'web'; label: Localized; url: string }
  | { kind: 'call'; label: Localized; number: string };

/** One paragraph of a step, with an optional small heading ("Puce brésilienne") and buttons. */
export type StepBlock = { heading?: Localized; text: Localized; links?: StepLink[] };

export type HelpStep = {
  id: 'lock' | 'celularSeguro' | 'sim' | 'banks' | 'police' | 'imei' | 'whatsapp' | 'passwords';
  icon: IconName;
  title: Localized;
  /** One line under the title: what the step is for. */
  summary: Localized;
  blocks: StepBlock[];
  /** Official pages this step was written from. */
  sources: string[];
};

const web = (fr: string, en: string, url: string): StepLink => ({ kind: 'web', label: L(fr, en), url });
const call = (fr: string, en: string, number: string): StepLink => ({ kind: 'call', label: L(fr, en), number });

/** Shown on the help screen, in this order; the last step ("Prévenir Chez Toi") is drawn by the screen. */
export const HELP_STEPS: HelpStep[] = [
  {
    id: 'lock',
    icon: 'phoneLock',
    title: L('Verrouiller le téléphone à distance', 'Lock the phone remotely'),
    summary: L(
      'Depuis ce téléphone ou un ordinateur, en quelques minutes.',
      'From this phone or a computer, in a few minutes.',
    ),
    blocks: [
      {
        heading: L('iPhone', 'iPhone'),
        text: L(
          'Ouvrez icloud.com/find et connectez-vous avec le compte Apple de votre colocataire : aucun code de vérification n’est demandé. Choisissez son iPhone, puis « Marquer comme perdu ». Le téléphone se verrouille et Apple Pay est suspendu.',
          'Open icloud.com/find and sign in with your roommate’s Apple Account: no verification code is needed. Pick their iPhone, then “Mark As Lost”. The phone locks and Apple Pay is suspended.',
        ),
        links: [web('Ouvrir icloud.com/find', 'Open icloud.com/find', 'https://www.icloud.com/find')],
      },
      {
        heading: L('Android', 'Android'),
        text: L(
          'Ouvrez google.com/android/find et connectez-vous avec son compte Google. Choisissez le téléphone et marquez-le comme perdu : il se verrouille avec son code et peut afficher un message. Il faut qu’il soit allumé et connecté.',
          'Open google.com/android/find and sign in with their Google Account. Pick the phone and mark it as lost: it locks with its PIN and can show a message. It has to be on and connected.',
        ),
        links: [
          web('Ouvrir google.com/android/find', 'Open google.com/android/find', 'https://www.google.com/android/find'),
        ],
      },
      {
        text: L(
          'Effacez le téléphone seulement si vous êtes sûrs de ne pas le récupérer : c’est définitif. Pensez à vous déconnecter de ce téléphone à la fin.',
          'Erase the phone only if you are sure you won’t get it back: it can’t be undone. Remember to sign out of this phone at the end.',
        ),
      },
    ],
    sources: [
      // "You don't need a verification code to sign in, so you can sign in and mark your device as lost even if your trusted device was stolen."
      'https://support.apple.com/en-us/120837',
      // Lost Mode suspends Apple Pay cards; "Erasing your device can't be undone."
      'https://support.apple.com/en-us/104978',
      // Find Hub: google.com/android/find, mark as lost, factory reset; device must have power and be connected.
      'https://support.google.com/android/answer/6160491',
    ],
  },
  {
    id: 'celularSeguro',
    icon: 'shieldLock',
    title: L('Alerte Celular Seguro, si elle a été préparée', 'Celular Seguro alert, if it was set up'),
    summary: L(
      'Une seule alerte prévient l’opérateur et les banques partenaires.',
      'One alert notifies the carrier and the partner banks.',
    ),
    blocks: [
      {
        text: L(
          'Votre colocataire se connecte avec son compte gov.br sur celularseguro.mj.gov.br et choisit « Emitir alerta ». S’il n’arrive pas à se connecter, la personne de confiance qu’il a choisie peut envoyer l’alerte depuis son propre compte.',
          'Your roommate signs in with their gov.br account on celularseguro.mj.gov.br and chooses “Emitir alerta”. If they can’t sign in, the trusted person they chose can send the alert from their own account.',
        ),
        links: [web('Ouvrir Celular Seguro', 'Open Celular Seguro', 'https://celularseguro.mj.gov.br')],
      },
      {
        text: L(
          '« Modo recuperação » bloque la ligne et les comptes chez les partenaires, et laisse la police retrouver le téléphone. « Bloqueio total » bloque aussi l’appareil, et ne peut plus être annulé dans l’appli.',
          '“Modo recuperação” blocks the line and the accounts at partner companies, and lets the police find the phone. “Bloqueio total” blocks the device as well, and can’t be undone in the app.',
        ),
      },
      {
        text: L(
          'Ça ne marche que pour un numéro brésilien au nom (CPF) de votre colocataire. Si son opérateur n’est pas dans la liste de l’appli, appelez-le aussi (étape suivante). L’alerte ne remplace pas la plainte.',
          'It only works for a Brazilian number in your roommate’s name (CPF). If their carrier isn’t listed in the app, call it too (next step). The alert doesn’t replace the police report.',
        ),
      },
    ],
    sources: [
      // "Defina pessoas autorizadas a registrar roubo ou furto por você, caso não consiga acessar o sistema."
      'https://www.gov.br/mj/pt-br/acesso-a-informacao/acoes-e-programas/celular-seguro',
      // gov.br account; CPF of the line holder; recovery mode vs total block; only listed carriers block lines;
      // international numbers can't send alerts; the alert doesn't replace the BO; partner banks block access.
      'https://www.gov.br/mj/pt-br/acesso-a-informacao/acoes-e-programas/celular-seguro/duvidas-frequentes',
      'https://www.gov.br/mj/pt-br/acesso-a-informacao/acoes-e-programas/sofri-um-golpe-e-agora/levaram-meu-celular',
    ],
  },
  {
    id: 'sim',
    icon: 'simCard',
    title: L('Bloquer la puce', 'Block the SIM'),
    summary: L('Pour que personne n’utilise son numéro.', 'So nobody can use their number.'),
    blocks: [
      {
        heading: L('Puce brésilienne', 'Brazilian SIM'),
        text: L(
          'Votre colocataire appelle son opérateur depuis votre téléphone et parle lui-même : l’opérateur vérifie que c’est le titulaire de la ligne. Il faut le numéro, la date et l’heure du vol, et ses informations d’identité. Demandez de bloquer la ligne et aussi l’appareil. Même avec une eSIM, il faut bloquer la ligne.',
          'Your roommate calls their carrier from your phone and speaks themselves: the carrier checks that they hold the line. They need the number, the date and time of the theft, and their ID details. Ask to block the line and the device too. Even with an eSIM, the line has to be blocked.',
        ),
        links: [
          call('Vivo · 1058', 'Vivo · 1058', '1058'),
          call('Claro · 1052', 'Claro · 1052', '1052'),
          call('TIM · 1056', 'TIM · 1056', '1056'),
        ],
      },
      {
        heading: L('Puce française', 'French SIM'),
        text: L(
          'Suspendez la ligne sur l’espace client de l’opérateur, depuis un ordinateur, ou par son numéro d’urgence. Orange depuis l’étranger : +33 9 69 39 39 00 (appel international). Bouygues Telecom : appli ou espace client, « Déclarer la perte ou le vol de mon téléphone ». Free : Espace Abonné, « Commander une nouvelle SIM », puis « Oui, je souhaite suspendre ma ligne ».',
          'Suspend the line in the carrier’s online account, from a computer, or through its emergency number. Orange from abroad: +33 9 69 39 39 00 (international call). Bouygues Telecom: app or online account, “Déclarer la perte ou le vol de mon téléphone”. Free: Espace Abonné, “Commander une nouvelle SIM”, then “Oui, je souhaite suspendre ma ligne”.',
        ),
        links: [call('Orange · +33 9 69 39 39 00', 'Orange · +33 9 69 39 39 00', '+33969393900')],
      },
    ],
    sources: [
      // Carriers block the line and the phone (IMEI in the shared CEMI base); dual SIM = every IMEI.
      'https://www.gov.br/anatel/pt-br/assuntos/celular-legal/celular-roubado',
      // "Só é preciso informar o número do celular. Não há mais necessidade de fornecer o IMEI." (modified 31/08/2025)
      'https://www.gov.br/anatel/pt-br/consumidor/conheca-seus-direitos-2/telefonia-movel/perda-ou-roubo-do-aparelho-celular',
      // "ligue *8486 do seu celular Vivo ou 1058 de qualquer telefone". The page answers 403 to fetchers:
      // read through the search index on 2026-11-08. TODO: à vérifier sur la page elle-même.
      'https://www.vivo.com.br/para-voce/chip-vivo',
      // "Se você é cliente Claro móvel, ligue para 1052."
      'https://www.claro.com.br/seguranca/bloqueio-de-chip',
      // "ligue 1056" from another phone, *144 from a TIM number; "Apenas o titular pode solicitar o bloqueio".
      'https://www.tim.com.br/ajuda/perda-e-roubo',
      // "Contate sua operadora de telefonia para bloquear/desativar o chip virtual (eSIM)".
      'https://www.gov.br/mj/pt-br/acesso-a-informacao/acoes-e-programas/sofri-um-golpe-e-agora/levaram-meu-celular',
      // Suspend through the operator's website (espace client) or its emergency number (vérifié le 01/09/2025).
      'https://www.service-public.gouv.fr/particuliers/vosdroits/F19066',
      // "Depuis l'étranger, composer le +33 969 39 3900" (mise à jour le 06/11/2026).
      'https://assistance.orange.fr/mobile-tablette/tous-les-mobiles-et-tablettes/depanner/mobile-casse-perdu-ou-vole/carte-sim-esim-et-multi-sim-suspendre-votre-ligne_177997-725194',
      // App / espace client path; 1064 is given without an international number, so it isn't shown.
      'https://www.bouyguestelecom.fr/guide-pratique/smartphones/telephone-vole-perdu-que-faire',
      // Espace Abonné > Mon compte > Mon offre > Commander une nouvelle SIM > "Oui, je souhaite suspendre ma ligne".
      'https://assistance.free.fr/articles/921',
      // TODO: SFR (sfr.fr blocks fetchers): à vérifier avant d'ajouter son chemin ou son numéro depuis l'étranger.
    ],
  },
  {
    id: 'banks',
    icon: 'cardOff',
    title: L('Bloquer les banques et le Pix', 'Block banks and Pix'),
    summary: L('Cartes, applis bancaires et Pix.', 'Cards, banking apps and Pix.'),
    blocks: [
      {
        heading: L('Banque brésilienne', 'Brazilian bank'),
        text: L(
          'Appelez le numéro au dos de la carte, ou passez par un autre canal officiel de la banque. Demandez de bloquer l’accès des applis depuis le téléphone volé, les mots de passe et les cartes, et de supprimer la connexion par biométrie. Si de l’argent est parti par Pix, dites-le tout de suite : la banque peut lancer le MED, le mécanisme de retour du Pix.',
          'Call the number on the back of the card, or use another official channel of the bank. Ask them to block the apps’ access from the stolen phone, the passwords and the cards, and to remove biometric login. If money left by Pix, say so right away: the bank can start the MED, Pix’s return mechanism.',
        ),
      },
      {
        heading: L('Carte française', 'French card'),
        text: L(
          'Faites opposition dans l’appli ou sur le site de la banque, depuis un ordinateur, ou appelez son numéro d’opposition : au dos de la carte, dans le contrat ou sur son site. Certaines banques ont un numéro spécial depuis l’étranger. Notez le numéro d’enregistrement qu’on vous donne.',
          'Block the card in the bank’s app or website, from a computer, or call its card-blocking number: on the back of the card, in the contract or on its website. Some banks have a special number from abroad. Write down the reference number they give you.',
        ),
      },
      {
        text: L(
          'Serveur interbancaire d’opposition, depuis la France : 0 892 705 705, 24 h sur 24, appel payant.',
          'Interbank card-blocking line, from France: 0 892 705 705, 24/7, paid call.',
        ),
      },
    ],
    sources: [
      // Bank: block app access, passwords, cards; "peça ao banco a revogação do login por biometria".
      'https://www.gov.br/mj/pt-br/acesso-a-informacao/acoes-e-programas/sofri-um-golpe-e-agora/levaram-meu-celular',
      // FAQ question 15: "o MED pode ser acionado em qualquer caso de fundada suspeita de fraude em que o Pix foi
      // utilizado, incluindo golpes e roubos de dispositivos" + contact the PSP "o mais rapidamente possível".
      'https://www.bcb.gov.br/content/estabilidadefinanceira/pix/FAQ_Participantes.pdf',
      // Bank number on the back of the card, in the contract or the website; most banks allow opposition in the
      // espace personnel; "À l'étranger, certains établissements proposent un numéro spécial" (24/06/2026).
      'https://www.lesclesdelabanque.com/particulier/opposition-carte-bancaire/',
      // 0 892 705 705, numéro d'enregistrement, special number abroad for some banks (vérifié le 06/02/2025).
      'https://www.service-public.gouv.fr/particuliers/vosdroits/F2428',
      // 0 892 705 705, "Ouvert 7 jours/7 et 24h/24", numéro majoré. No international number given: none shown.
      'https://lannuaire.service-public.gouv.fr/centres-contact/R86',
    ],
  },
  {
    id: 'police',
    icon: 'police',
    title: L('Porter plainte (boletim de ocorrência)', 'Report it to the police (boletim de ocorrência)'),
    summary: L(
      'Nécessaire même avec Celular Seguro, et pour bloquer l’appareil.',
      'Needed even with Celular Seguro, and to block the device.',
    ),
    blocks: [
      {
        heading: L('Sans violence ni menace (furto)', 'No violence or threat (furto)'),
        text: L(
          'Si votre colocataire n’a pas été menacé et ne sait pas qui l’a pris, la plainte se fait en ligne sur la Delegacia Virtual de Minas Gerais, dans les 30 jours, avec son passeport. Le numéro de la plainte (REDS) arrive par e-mail après vérification, en général en 45 à 60 minutes.',
          'If your roommate wasn’t threatened and doesn’t know who took it, report it online on the Minas Gerais Delegacia Virtual, within 30 days, with their passport. The report number (REDS) arrives by email once checked, usually in 45 to 60 minutes.',
        ),
        links: [web('Ouvrir la Delegacia Virtual', 'Open the Delegacia Virtual', 'https://delegaciavirtual.sids.mg.gov.br')],
      },
      {
        heading: L('Avec violence ou menace (roubo)', 'With violence or a threat (roubo)'),
        text: L(
          'La plainte se fait sur place, dans un poste de la Polícia Civil ou de la Polícia Militar. En cas de danger, appelez le 190.',
          'Report it in person, at a Polícia Civil or Polícia Militar station. If you are in danger, call 190.',
        ),
        links: [call('Police · 190', 'Police · 190', '190')],
      },
      {
        text: L(
          'Gardez le numéro du REDS : il sert pour bloquer l’appareil (étape suivante) et pour la banque.',
          'Keep the REDS number: it is needed to block the device (next step) and by the bank.',
        ),
      },
    ],
    sources: [
      // Online furto: "sem violência ou ameaça", no information on who did it, within 30 days, CPF "ou passaporte/RNE",
      // email in 45 to 60 minutes; violence or threats: in person at Polícia Civil or Militar (updated 21/01/2025).
      'https://www.mg.gov.br/servico/solicitar-registro-de-ocorrencia-de-furto',
      'https://delegaciavirtual.sids.mg.gov.br',
      // The Celular Seguro alert doesn't replace the BO.
      'https://www.gov.br/mj/pt-br/acesso-a-informacao/acoes-e-programas/celular-seguro/duvidas-frequentes',
      // Share the BO with the bank.
      'https://www.gov.br/mj/pt-br/acesso-a-informacao/acoes-e-programas/sofri-um-golpe-e-agora/levaram-meu-celular',
    ],
  },
  {
    id: 'imei',
    icon: 'imei',
    title: L('Bloquer l’appareil (IMEI)', 'Block the device (IMEI)'),
    summary: L(
      'Le téléphone ne marche plus sur les réseaux mobiles brésiliens.',
      'The phone stops working on Brazilian mobile networks.',
    ),
    blocks: [
      {
        text: L(
          'Dans les 48 heures après la plainte, demandez-le sur la Cbloc, le service de l’État de Minas Gerais, avec le numéro du REDS. Il faut le numéro de la ligne, ou l’IMEI si le téléphone n’avait pas de puce. L’appareil est bloqué en 24 heures. La Cbloc ne bloque pas la ligne : ça, c’est l’opérateur.',
          'Within 48 hours of the report, request it on Cbloc, the Minas Gerais state service, with the REDS number. You need the line number, or the IMEI if the phone had no SIM. The device is blocked within 24 hours. Cbloc doesn’t block the line: the carrier does that.',
        ),
        links: [web('Ouvrir la Cbloc', 'Open Cbloc', 'https://cbloc.seguranca.mg.gov.br')],
      },
      {
        text: L(
          'Un téléphone à deux puces a deux IMEI : il faut bloquer les deux. Si on le retrouve, seul celui qui a demandé le blocage peut le faire lever.',
          'A dual-SIM phone has two IMEIs: both have to be blocked. If it is found, only the person who asked for the block can have it lifted.',
        ),
      },
    ],
    sources: [
      // Cbloc: within 48 h of the REDS, line number (or IMEI if not linked to a carrier), blocked with Anatel
      // within 24 h, "A Cbloc inutiliza apenas o aparelho" (updated 18/06/2026).
      'https://www.mg.gov.br/servico/bloquear-celular-roubado-ou-furtado-no-sistema-line-da-cbloc',
      // Dual SIM: "é necessário realizar o bloqueio de todos os IMEIs"; "Apenas quem solicitou o bloqueio pode pedir o desbloqueio".
      'https://www.gov.br/anatel/pt-br/assuntos/celular-legal/celular-roubado',
    ],
  },
  {
    id: 'whatsapp',
    icon: 'whatsapp',
    title: L('Récupérer WhatsApp', 'Get WhatsApp back'),
    summary: L(
      'Avec une nouvelle puce au même numéro.',
      'With a new SIM with the same number.',
    ),
    blocks: [
      {
        text: L(
          'WhatsApp ne peut pas désactiver un compte à distance. Une fois la puce bloquée, votre colocataire demande à son opérateur une nouvelle puce avec le même numéro, en boutique avec une pièce d’identité, puis réinstalle WhatsApp sur un autre téléphone : le téléphone volé est alors déconnecté.',
          'WhatsApp can’t deactivate an account remotely. Once the SIM is blocked, your roommate asks their carrier for a new SIM with the same number, in a store with an ID, then sets up WhatsApp on another phone: the stolen phone is then logged out.',
        ),
        links: [web('Aide WhatsApp', 'WhatsApp Help', 'https://faq.whatsapp.com/1007324800132703')],
      },
    ],
    sources: [
      // Block the SIM, new SIM with the same number, register again; "Não é possível desativar o WhatsApp
      // remotamente usando outro dispositivo"; the lost device is logged out once re-registered.
      'https://faq.whatsapp.com/1007324800132703',
      'https://faq.whatsapp.com/969230211289837',
      // New SIM in a store with a photo ID (Claro, TIM).
      'https://www.claro.com.br/seguranca/bloqueio-de-chip',
      'https://www.tim.com.br/ajuda/perda-e-roubo',
    ],
  },
  {
    id: 'passwords',
    icon: 'key',
    title: L('Changer les mots de passe', 'Change passwords'),
    summary: L('Depuis un ordinateur ou ce téléphone.', 'From a computer or this phone.'),
    blocks: [
      {
        text: L(
          'E-mail, compte Apple ou Google, réseaux sociaux, messageries et applis bancaires : changez les mots de passe qui étaient enregistrés sur le téléphone volé.',
          'Email, Apple or Google account, social networks, messaging and banking apps: change the passwords that were saved on the stolen phone.',
        ),
      },
    ],
    sources: [
      'https://www.gov.br/mj/pt-br/acesso-a-informacao/acoes-e-programas/sofri-um-golpe-e-agora/levaram-meu-celular',
      'https://www.service-public.gouv.fr/particuliers/vosdroits/F19066',
    ],
  },
];

/* ---------- Before it happens ---------- */

export const PREP_STEPS = ['findMy', 'account', 'imei', 'celularSeguro', 'bank', 'whatsapp'] as const;
export type PrepStepId = (typeof PREP_STEPS)[number];

export type PrepStep = {
  id: PrepStepId;
  icon: IconName;
  title: Localized;
  text: Localized;
  link?: StepLink;
  sources: string[];
};

export const PREP_CONTENT: Record<PrepStepId, PrepStep> = {
  findMy: {
    id: 'findMy',
    icon: 'phoneLock',
    title: L('Activer Localiser', 'Turn on Find My'),
    text: L(
      'Sans ça, impossible de bloquer le téléphone à distance. iPhone : Réglages, votre nom, Localiser, puis Localiser mon iPhone, et le réseau Localiser. Android : Paramètres, Sécurité, Localiser (Find Hub), et autorisez la localisation de l’appareil.',
      'Without it, the phone can’t be locked remotely. iPhone: Settings, your name, Find My, then Find My iPhone, and the Find My network. Android: Settings, Security, Find Hub, and allow the device to be located.',
    ),
    sources: [
      // "In order to locate a device, you must turn on Find My [device] before it's lost."
      'https://support.apple.com/en-us/102648',
      // Settings > Security > Find Hub > "Allow device to be located".
      'https://support.google.com/android/answer/3265955',
    ],
  },
  account: {
    id: 'account',
    icon: 'key',
    title: L('Connaître son mot de passe Apple ou Google', 'Know your Apple or Google password'),
    text: L(
      'C’est lui qui permet de verrouiller le téléphone depuis un autre appareil. Sur icloud.com/find, aucun code n’est demandé. Sur Android, créez aussi des codes de secours de la validation en deux étapes Google, et gardez-les hors du téléphone.',
      'It is what lets you lock the phone from another device. On icloud.com/find, no code is asked. On Android, also create backup codes for Google 2-Step Verification, and keep them off the phone.',
    ),
    sources: [
      'https://support.apple.com/en-us/120837',
      // "Create 2-Step Verification backup codes in your Google Account, so you can lock or erase the device if you lose it."
      'https://support.google.com/android/answer/3265955',
    ],
  },
  imei: {
    id: 'imei',
    icon: 'imei',
    title: L('Noter l’IMEI et son numéro', 'Write down the IMEI and your number'),
    text: L(
      'Composez *#06# : le téléphone affiche son IMEI, ou deux s’il a deux puces. Notez-les avec votre numéro et votre opérateur, hors du téléphone : sur papier ou dans un e-mail à vous-même.',
      'Dial *#06#: the phone shows its IMEI, or two if it has two SIMs. Write them down with your number and carrier, off the phone: on paper or in an email to yourself.',
    ),
    sources: [
      // *#06#; dual-SIM phones have one IMEI per SIM.
      'https://www.gov.br/mj/pt-br/acesso-a-informacao/acoes-e-programas/celular-seguro/duvidas-frequentes',
      // Note the IMEI somewhere outside the phone.
      'https://www.service-public.gouv.fr/particuliers/vosdroits/F19066',
    ],
  },
  celularSeguro: {
    id: 'celularSeguro',
    icon: 'shieldLock',
    title: L('Préparer Celular Seguro', 'Set up Celular Seguro'),
    text: L(
      'Si vous avez un CPF et une ligne brésilienne à votre nom. Connectez-vous avec votre compte gov.br, enregistrez votre téléphone, puis ajoutez une personne de confiance, un colocataire par exemple : elle pourra donner l’alerte à votre place. Les numéros étrangers ne sont pas acceptés.',
      'If you have a CPF and a Brazilian line in your name. Sign in with your gov.br account, register your phone, then add a trusted person, a roommate for example: they can raise the alert for you. Foreign numbers aren’t accepted.',
    ),
    link: web('Ouvrir Celular Seguro', 'Open Celular Seguro', 'https://celularseguro.mj.gov.br'),
    sources: [
      'https://www.gov.br/mj/pt-br/acesso-a-informacao/acoes-e-programas/celular-seguro',
      'https://www.gov.br/mj/pt-br/acesso-a-informacao/acoes-e-programas/celular-seguro/duvidas-frequentes',
      // "Não há possibilidade de cadastro sem CPF."
      'https://acesso.gov.br/faq/_perguntasdafaq/cadastrosemcpf.html',
      // TODO: à vérifier si la personne de confiance doit elle-même avoir un CPF et un compte gov.br (the official
      // pages don't say; press articles mention the trusted person's CPF). Not shown in the app until confirmed.
    ],
  },
  bank: {
    id: 'bank',
    icon: 'bank',
    title: L('Garder le numéro d’opposition de sa banque', 'Keep your bank’s card-blocking number'),
    text: L(
      'Sur le site de votre banque française, cherchez le numéro à appeler depuis l’étranger pour faire opposition : certaines banques en ont un spécial. Faites de même pour votre banque brésilienne, et gardez-les avec l’IMEI.',
      'On your French bank’s website, look for the number to call from abroad to block a card: some banks have a special one. Do the same for your Brazilian bank, and keep them with the IMEI.',
    ),
    sources: [
      'https://www.service-public.gouv.fr/particuliers/vosdroits/F2428',
      'https://www.lesclesdelabanque.com/particulier/opposition-carte-bancaire/',
    ],
  },
  whatsapp: {
    id: 'whatsapp',
    icon: 'whatsapp',
    title: L('Protéger WhatsApp', 'Protect WhatsApp'),
    text: L(
      'Dans WhatsApp : Réglages, Compte, puis la validation en deux étapes. Une couche de sécurité en plus sur votre compte.',
      'In WhatsApp: Settings, Account, then Two-step verification. An extra layer of security on your account.',
    ),
    sources: [
      // "A verificação em duas etapas é um recurso opcional que adiciona uma camada extra de segurança".
      'https://faq.whatsapp.com/1278661612895630',
    ],
  },
};

type Stored = { done: PrepStepId[] };
const EMPTY: Stored = { done: [] };

/** Kept on this phone (the steps are about this phone, not the account). */
const STORAGE_KEY = 'ctbh.phoneStolen.prep.v1';

/** Which "before it happens" steps are done, kept on the phone (same pattern as `useWelcome`). */
export function usePhonePrep() {
  const [stored, setStored] = useState<Stored | null>(null);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (alive) setStored(raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Stored>) } : EMPTY);
      })
      .catch(() => alive && setStored(EMPTY));
    return () => {
      alive = false;
    };
  }, []);

  const toggle = useCallback((step: PrepStepId) => {
    setStored((prev) => {
      const done = (prev ?? EMPTY).done;
      const next = { done: done.includes(step) ? done.filter((s) => s !== step) : [...done, step] };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const done = stored?.done ?? [];
  return { loaded: stored != null, done, toggle };
}
