import type { Lang } from '@/i18n';

/**
 * "Parler portugais" (owner, 2026-11-08: "frases em francês traduzidas ou … uma espécie de duolingo dentro
 * do app"): Brazilian Portuguese as people say it in Belo Horizonte, by situation, with the French and
 * English meaning and a pronunciation hint written for French speakers.
 *
 * Pronunciation hints (`say`), read with French spelling:
 * - the stressed syllable is in capitals, syllables of a word are joined by hyphens;
 * - ou = the Portuguese u (and a final o), i = a final e, è/é and o/ô = open/closed vowels;
 * - dj and tch = d and t before an i sound (BH says "bon DJI-a", "lei-TCHI");
 * - h = the Portuguese r at the start of a word or rr (an aspirated h, as in English "house");
 * - gn = nh, ly = lh, ss = a hard s, z = s between vowels;
 * - aon = ão, an/in/ein/oun = nasal vowels; a final l sounds like ou (Brasil = bra-ZIOU);
 * - the final r of verbs is dropped, as in everyday BH speech (falar = fa-LA).
 *
 * Phrase ids are stored on the phone (phrases learned): never reuse or change an id; add new ids instead.
 */

export type Phrase = {
  id: string;
  /** Brazilian Portuguese, as said in BH. Read aloud by the text-to-speech. */
  pt: string;
  fr: string;
  en: string;
  /** Pronunciation for French speakers (see the rules above). */
  say: string;
  /** Context worth knowing: a gender variant, a local word, an emergency number. */
  note?: { fr: string; en: string };
};

export type SituationId =
  | 'basics'
  | 'ride'
  | 'restaurant'
  | 'bakery'
  | 'pharmacy'
  | 'emergency'
  | 'building'
  | 'party'
  | 'university'
  | 'bank';

export type Situation = {
  id: SituationId;
  /** Shown only in the situation tile (emoji are allowed in tiles). */
  emoji: string;
  title: { fr: string; en: string };
  hint: { fr: string; en: string };
  phrases: Phrase[];
};

const woman = (word: string) => ({ fr: `« ${word} » pour une femme.`, en: `Women say “${word}”.` });

export const SITUATIONS: Situation[] = [
  {
    id: 'basics',
    emoji: '👋',
    title: { fr: 'L’essentiel', en: 'The basics' },
    hint: {
      fr: 'Saluer, remercier, et les mots de Minas : uai, trem, sô',
      en: 'Hello, thanks, and the Minas words: uai, trem, sô',
    },
    phrases: [
      {
        id: 'basics-hi',
        pt: 'Oi, tudo bem?',
        fr: 'Salut, ça va ?',
        en: 'Hi, how are you?',
        say: 'oï, TOU-dou bein ?',
        note: { fr: 'Réponse : « Tudo, e você? » (Ça va, et toi ?).', en: 'Answer: “Tudo, e você?” (Good, and you?).' },
      },
      {
        id: 'basics-beleza',
        pt: 'Beleza?',
        fr: 'Ça roule ?',
        en: 'All good?',
        say: 'bé-LÊ-za ?',
        note: { fr: 'Entre amis. Réponse : « Beleza! ».', en: 'Between friends. Answer: “Beleza!”.' },
      },
      {
        id: 'basics-thanks',
        pt: 'Obrigado!',
        fr: 'Merci !',
        en: 'Thank you!',
        say: 'o-bri-GA-dou !',
        note: woman('Obrigada'),
      },
      {
        id: 'basics-valeu',
        pt: 'Valeu!',
        fr: 'Merci ! (entre amis)',
        en: 'Thanks! (casual)',
        say: 'va-LÊOU !',
      },
      {
        id: 'basics-welcome',
        pt: 'De nada!',
        fr: 'De rien !',
        en: 'You’re welcome!',
        say: 'dji NA-da !',
        note: { fr: 'On entend aussi « Imagina! ».', en: 'You’ll also hear “Imagina!”.' },
      },
      {
        id: 'basics-excuse',
        pt: 'Com licença.',
        fr: 'Pardon (pour passer).',
        en: 'Excuse me (to get past).',
        say: 'kon li-SSEN-ssa',
      },
      {
        id: 'basics-uai',
        pt: 'Uai!',
        fr: 'Ben ! / Ah bon ?',
        en: 'Well! / Huh?',
        say: 'ouaï !',
        note: {
          fr: 'Le mot de Minas par excellence : surprise, évidence ou hésitation.',
          en: 'The Minas word above all: surprise, “obviously”, or hesitation.',
        },
      },
      {
        id: 'basics-trem',
        pt: 'Esse trem é bão demais!',
        fr: 'Ce truc est trop bon !',
        en: 'This thing is so good!',
        say: 'Ê-ssi trein è baon dji-MAÏS !',
        note: {
          fr: 'À Minas, « trem » (le train) veut dire « truc », n’importe quoi. « Bão » = « bom ».',
          en: 'In Minas, “trem” (train) means “thing”, anything. “Bão” = “bom” (good).',
        },
      },
      {
        id: 'basics-so',
        pt: 'Cê tá bão, sô?',
        fr: 'Ça va bien, mon vieux ?',
        en: 'You doing good, man?',
        say: 'ssê ta baon, ssô ?',
        note: {
          fr: '« Cê » = « você ». « Sô » (de « senhor ») ponctue les phrases entre amis.',
          en: '“Cê” = “você”. “Sô” (from “senhor”) punctuates sentences between friends.',
        },
      },
      {
        id: 'basics-nossa',
        pt: 'Nossa, que calor!',
        fr: 'Waouh, qu’il fait chaud !',
        en: 'Wow, it’s so hot!',
        say: 'NO-ssa, ki ka-LÔ !',
        note: {
          fr: '« Nossa » marque la surprise ; à BH on l’abrège souvent en « nó ».',
          en: '“Nossa” shows surprise; in BH it’s often cut to “nó”.',
        },
      },
      {
        id: 'basics-conta',
        pt: 'Não dou conta!',
        fr: 'Je n’y arrive pas ! / Je n’en peux plus !',
        en: 'I can’t handle it!',
        say: 'naon dô KON-ta !',
        note: { fr: '« Dar conta » (y arriver) : très mineiro.', en: '“Dar conta” (to manage): very mineiro.' },
      },
      {
        id: 'basics-cade',
        pt: 'Cadê você?',
        fr: 'T’es où ?',
        en: 'Where are you?',
        say: 'ka-DÊ vo-SÊ ?',
        note: { fr: '« Cadê » = « où est », partout au Brésil.', en: '“Cadê” = “where is”, all over Brazil.' },
      },
    ],
  },
  {
    id: 'ride',
    emoji: '🚕',
    title: { fr: 'Uber, 99 et taxi', en: 'Uber, 99 and taxis' },
    hint: { fr: 'Monter, guider le chauffeur, descendre', en: 'Getting in, guiding the driver, getting out' },
    phrases: [
      {
        id: 'ride-driver',
        pt: 'Oi! Você é o Marcos, do Uber?',
        fr: 'Bonjour ! Vous êtes Marcos, le chauffeur Uber ?',
        en: 'Hi! Are you Marcos, the Uber driver?',
        say: 'oï ! vo-SÊ è ou MAR-kous, dou OU-bèr ?',
        note: {
          fr: 'Vérifiez toujours le prénom et la plaque avant de monter.',
          en: 'Always check the name and the plate before getting in.',
        },
      },
      {
        id: 'ride-waiting',
        pt: 'Eu tô esperando na portaria.',
        fr: 'J’attends à l’entrée de l’immeuble.',
        en: 'I’m waiting at the building entrance.',
        say: 'éou tô is-pé-RAN-dou na por-ta-RI-a',
      },
      {
        id: 'ride-coming',
        pt: 'Já tô descendo!',
        fr: 'Je descends tout de suite !',
        en: 'I’m coming down now!',
        say: 'ja tô dé-SSEN-dou !',
      },
      {
        id: 'ride-trunk',
        pt: 'Pode abrir o porta-malas, por favor?',
        fr: 'Vous pouvez ouvrir le coffre, s’il vous plaît ?',
        en: 'Could you open the trunk, please?',
        say: 'PO-dji a-BRI ou por-ta-MA-las, pour fa-VÔ ?',
      },
      {
        id: 'ride-ac',
        pt: 'Pode ligar o ar, por favor?',
        fr: 'Vous pouvez mettre la clim, s’il vous plaît ?',
        en: 'Could you turn on the AC, please?',
        say: 'PO-dji li-GA ou ah, pour fa-VÔ ?',
      },
      {
        id: 'ride-app',
        pt: 'Pode seguir pelo aplicativo, por favor.',
        fr: 'Vous pouvez suivre l’itinéraire de l’appli, s’il vous plaît.',
        en: 'You can follow the route in the app, please.',
        say: 'PO-dji ssé-GUI PÊ-lou a-pli-ka-TCHI-vou, pour fa-VÔ',
      },
      {
        id: 'ride-slow',
        pt: 'Pode ir mais devagar, por favor?',
        fr: 'Vous pouvez rouler moins vite, s’il vous plaît ?',
        en: 'Could you slow down, please?',
        say: 'PO-dji i maïs dji-va-GA, pour fa-VÔ ?',
      },
      {
        id: 'ride-corner',
        pt: 'Pode parar ali na esquina?',
        fr: 'Vous pouvez vous arrêter là, au coin ?',
        en: 'Can you stop there, at the corner?',
        say: 'PO-dji pa-RA a-LI na is-KI-na ?',
      },
      {
        id: 'ride-here',
        pt: 'Pode me deixar aqui mesmo.',
        fr: 'Vous pouvez me déposer ici.',
        en: 'You can drop me off right here.',
        say: 'PO-dji mi dêi-CHA a-KI MÊZ-mou',
      },
      {
        id: 'ride-price',
        pt: 'Quanto fica até o centro?',
        fr: 'C’est combien jusqu’au centre ?',
        en: 'How much is it to downtown?',
        say: 'KOUAN-tou FI-ka a-TÉ ou SSEN-trou ?',
      },
      {
        id: 'ride-card',
        pt: 'Aceita cartão?',
        fr: 'Vous acceptez la carte ?',
        en: 'Do you take cards?',
        say: 'a-SSÊI-ta kar-TAON ?',
      },
    ],
  },
  {
    id: 'restaurant',
    emoji: '🍽️',
    title: { fr: 'Restaurant et bar', en: 'Restaurants and bars' },
    hint: { fr: 'Commander, l’addition, le boteco', en: 'Ordering, the bill, the boteco' },
    phrases: [
      {
        id: 'restaurant-table',
        pt: 'Uma mesa pra dois, por favor.',
        fr: 'Une table pour deux, s’il vous plaît.',
        en: 'A table for two, please.',
        say: 'OU-ma MÊ-za pra dôïs, pour fa-VÔ',
      },
      {
        id: 'restaurant-menu',
        pt: 'Me traz o cardápio, por favor?',
        fr: 'Vous m’apportez la carte, s’il vous plaît ?',
        en: 'Could you bring me the menu, please?',
        say: 'mi traïs ou kar-DA-piou, pour fa-VÔ ?',
      },
      {
        id: 'restaurant-recommend',
        pt: 'O que você recomenda?',
        fr: 'Qu’est-ce que vous recommandez ?',
        en: 'What do you recommend?',
        say: 'ou ki vo-SÊ hé-ko-MEN-da ?',
      },
      {
        id: 'restaurant-beer',
        pt: 'Me vê uma cerveja, por favor.',
        fr: 'Une bière, s’il vous plaît.',
        en: 'A beer, please.',
        say: 'mi vê OU-ma ssèr-VÊ-ja, pour fa-VÔ',
        note: {
          fr: '« Me vê » (litt. « montre-moi ») : la façon familière de commander, très courante à BH.',
          en: '“Me vê” (literally “show me”): the casual way to order, very common in BH.',
        },
      },
      {
        id: 'restaurant-another',
        pt: 'Desce mais uma!',
        fr: 'Une autre !',
        en: 'Another one!',
        say: 'DÊ-ssi maïs OU-ma !',
        note: {
          fr: 'Au boteco, pour recommander une bière (litt. « fais-en descendre une autre »).',
          en: 'At the boteco, to order another beer (literally “send down another one”).',
        },
      },
      {
        id: 'restaurant-veggie',
        pt: 'Tem opção vegetariana?',
        fr: 'Vous avez une option végétarienne ?',
        en: 'Do you have a vegetarian option?',
        say: 'tein op-SSAON vé-jé-ta-ri-A-na ?',
      },
      {
        id: 'restaurant-ice',
        pt: 'Sem gelo, por favor.',
        fr: 'Sans glaçons, s’il vous plaît.',
        en: 'No ice, please.',
        say: 'sein JÊ-lou, pour fa-VÔ',
      },
      {
        id: 'restaurant-delicious',
        pt: 'Tá uma delícia!',
        fr: 'C’est délicieux !',
        en: 'It’s delicious!',
        say: 'ta OU-ma dé-LI-ssia !',
      },
      {
        id: 'restaurant-bill',
        pt: 'A conta, por favor.',
        fr: 'L’addition, s’il vous plaît.',
        en: 'The check, please.',
        say: 'a KON-ta, pour fa-VÔ',
      },
      {
        id: 'restaurant-split',
        pt: 'Pode dividir em três no cartão?',
        fr: 'Vous pouvez diviser en trois, par carte ?',
        en: 'Can you split it three ways, by card?',
        say: 'PO-dji dji-vi-DJI ein três nou kar-TAON ?',
      },
      {
        id: 'restaurant-service',
        pt: 'Os dez por cento já estão incluídos?',
        fr: 'Le service de 10 % est déjà compris ?',
        en: 'Is the 10% service charge already included?',
        say: 'ous dèis pour SSEN-tou ja is-TAON in-klou-I-dous ?',
        note: {
          fr: 'Les 10 % de service s’ajoutent souvent à l’addition ; ils sont facultatifs.',
          en: 'A 10% service charge is often added to the bill; it’s optional.',
        },
      },
    ],
  },
  {
    id: 'bakery',
    emoji: '🥖',
    title: { fr: 'Padaria et courses', en: 'Bakery and groceries' },
    hint: { fr: 'Le pain du matin, la caisse, le supermarché', en: 'Morning bread, the checkout, the supermarket' },
    phrases: [
      {
        id: 'bakery-bread',
        pt: 'Me vê cinco pães de sal, por favor.',
        fr: 'Cinq petits pains, s’il vous plaît.',
        en: 'Five bread rolls, please.',
        say: 'mi vê SSIN-kou païns dji saou, pour fa-VÔ',
        note: {
          fr: 'À Minas, le petit pain (« pão francês » ailleurs au Brésil) s’appelle « pão de sal ».',
          en: 'In Minas, the bread roll (“pão francês” elsewhere in Brazil) is called “pão de sal”.',
        },
      },
      {
        id: 'bakery-paodequeijo',
        pt: 'Um pão de queijo e um café com leite.',
        fr: 'Un pão de queijo et un café au lait.',
        en: 'A cheese bread and a coffee with milk.',
        say: 'oun paon dji KÊI-jou i oun ka-FÉ kon LÊI-tchi',
      },
      {
        id: 'bakery-warm',
        pt: 'Tá quentinho?',
        fr: 'Il est encore chaud ?',
        en: 'Is it still warm?',
        say: 'ta kein-TCHI-gnou ?',
      },
      {
        id: 'bakery-ham',
        pt: 'Duzentos gramas de presunto, por favor.',
        fr: 'Deux cents grammes de jambon, s’il vous plaît.',
        en: 'Two hundred grams of ham, please.',
        say: 'dou-ZEN-tous GRA-mas dji pré-ZOUN-tou, pour fa-VÔ',
      },
      {
        id: 'bakery-kilo',
        pt: 'Quanto custa o quilo?',
        fr: 'C’est combien le kilo ?',
        en: 'How much is it per kilo?',
        say: 'KOUAN-tou KOUS-ta ou KI-lou ?',
      },
      {
        id: 'bakery-milk',
        pt: 'Onde fica o leite?',
        fr: 'Où est le lait ?',
        en: 'Where’s the milk?',
        say: 'ON-dji FI-ka ou LÊI-tchi ?',
      },
      {
        id: 'bakery-bag',
        pt: 'Tem sacola?',
        fr: 'Vous avez un sac ?',
        en: 'Do you have a bag?',
        say: 'tein ssa-KO-la ?',
        note: {
          fr: 'Les sacs sont souvent payants : gardez un sac réutilisable.',
          en: 'Bags often cost extra: keep a reusable one.',
        },
      },
      {
        id: 'bakery-cpf',
        pt: 'CPF na nota?',
        fr: 'Votre CPF sur le ticket ?',
        en: 'Your CPF on the receipt?',
        say: 'ssê pê È-fi na NO-ta ?',
        note: {
          fr: 'La question de la caisse. Sans CPF, répondez « Não, obrigado ».',
          en: 'The cashier asks this. If you have no CPF, answer “Não, obrigado”.',
        },
      },
      {
        id: 'bakery-debit',
        pt: 'Débito ou crédito?',
        fr: 'Débit ou crédit ?',
        en: 'Debit or credit?',
        say: 'DÈ-bi-tou ou KRÈ-dji-tou ?',
        note: {
          fr: 'Avec une carte étrangère, essayez « crédito » si « débito » ne passe pas.',
          en: 'With a foreign card, try “crédito” if “débito” doesn’t work.',
        },
      },
      {
        id: 'bakery-done',
        pt: 'É só isso, obrigado.',
        fr: 'Ce sera tout, merci.',
        en: 'That’s all, thanks.',
        say: 'è sso I-ssou, o-bri-GA-dou',
        note: woman('obrigada'),
      },
    ],
  },
  {
    id: 'pharmacy',
    emoji: '💊',
    title: { fr: 'Pharmacie et santé', en: 'Pharmacy and health' },
    hint: { fr: 'Dire où on a mal, acheter un médicament', en: 'Saying what hurts, buying medicine' },
    phrases: [
      {
        id: 'pharmacy-sick',
        pt: 'Tô passando mal.',
        fr: 'Je ne me sens pas bien.',
        en: 'I’m feeling sick.',
        say: 'tô pa-SSAN-dou maou',
      },
      {
        id: 'pharmacy-headache',
        pt: 'Tô com dor de cabeça.',
        fr: 'J’ai mal à la tête.',
        en: 'I have a headache.',
        say: 'tô kon dô dji ka-BÊ-ssa',
      },
      {
        id: 'pharmacy-fever',
        pt: 'Tô com febre.',
        fr: 'J’ai de la fièvre.',
        en: 'I have a fever.',
        say: 'tô kon FÈ-bri',
      },
      {
        id: 'pharmacy-throat',
        pt: 'Tô com dor de garganta.',
        fr: 'J’ai mal à la gorge.',
        en: 'I have a sore throat.',
        say: 'tô kon dô dji gar-GAN-ta',
      },
      {
        id: 'pharmacy-stomach',
        pt: 'Tô com dor de barriga.',
        fr: 'J’ai mal au ventre.',
        en: 'I have a stomachache.',
        say: 'tô kon dô dji ba-HI-ga',
      },
      {
        id: 'pharmacy-flu',
        pt: 'Você tem alguma coisa pra gripe?',
        fr: 'Vous avez quelque chose contre la grippe ?',
        en: 'Do you have something for the flu?',
        say: 'vo-SÊ tein aou-GOU-ma KOÏ-za pra GRI-pi ?',
      },
      {
        id: 'pharmacy-prescription',
        pt: 'Precisa de receita?',
        fr: 'Il faut une ordonnance ?',
        en: 'Do I need a prescription?',
        say: 'pré-SSI-za dji hé-SSÊI-ta ?',
      },
      {
        id: 'pharmacy-times',
        pt: 'Quantas vezes por dia?',
        fr: 'Combien de fois par jour ?',
        en: 'How many times a day?',
        say: 'KOUAN-tas VÊ-zis pour DJI-a ?',
      },
      {
        id: 'pharmacy-allergy',
        pt: 'Sou alérgico à penicilina.',
        fr: 'Je suis allergique à la pénicilline.',
        en: 'I’m allergic to penicillin.',
        say: 'ssô a-LÈR-ji-kou a pé-ni-ssi-LI-na',
        note: woman('alérgica'),
      },
      {
        id: 'pharmacy-sunscreen',
        pt: 'Tem protetor solar e repelente?',
        fr: 'Vous avez de la crème solaire et de l’anti-moustique ?',
        en: 'Do you have sunscreen and insect repellent?',
        say: 'tein pro-té-TÔ sso-LA i hé-pé-LEN-tchi ?',
        note: {
          fr: 'L’anti-moustique protège aussi de la dengue.',
          en: 'Repellent also protects you from dengue.',
        },
      },
      {
        id: 'pharmacy-doctor',
        pt: 'Preciso de um médico.',
        fr: 'J’ai besoin d’un médecin.',
        en: 'I need a doctor.',
        say: 'pré-SSI-zou dji oun MÈ-dji-kou',
      },
    ],
  },
  {
    id: 'emergency',
    emoji: '🚨',
    title: { fr: 'Urgences', en: 'Emergencies' },
    hint: {
      fr: 'Appeler à l’aide : SAMU 192, police 190, pompiers 193',
      en: 'Calling for help: SAMU 192, police 190, fire 193',
    },
    phrases: [
      {
        id: 'emergency-help',
        pt: 'Socorro!',
        fr: 'Au secours !',
        en: 'Help!',
        say: 'sso-KÔ-hou !',
      },
      {
        id: 'emergency-need-help',
        pt: 'Preciso de ajuda.',
        fr: 'J’ai besoin d’aide.',
        en: 'I need help.',
        say: 'pré-SSI-zou dji a-JOU-da',
      },
      {
        id: 'emergency-ambulance',
        pt: 'Chama uma ambulância!',
        fr: 'Appelez une ambulance !',
        en: 'Call an ambulance!',
        say: 'CHA-ma OU-ma an-bou-LAN-ssia !',
        note: { fr: 'SAMU (ambulance) : 192.', en: 'SAMU (ambulance): 192.' },
      },
      {
        id: 'emergency-police',
        pt: 'Chama a polícia!',
        fr: 'Appelez la police !',
        en: 'Call the police!',
        say: 'CHA-ma a po-LI-ssia !',
        note: { fr: 'Police : 190.', en: 'Police: 190.' },
      },
      {
        id: 'emergency-fire',
        pt: 'Tá pegando fogo!',
        fr: 'Il y a le feu !',
        en: 'There’s a fire!',
        say: 'ta pé-GAN-dou FÔ-gou !',
        note: { fr: 'Pompiers : 193.', en: 'Fire department: 193.' },
      },
      {
        id: 'emergency-hurt',
        pt: 'Tem alguém ferido.',
        fr: 'Il y a un blessé.',
        en: 'Someone is hurt.',
        say: 'tein aou-GUEIN fé-RI-dou',
      },
      {
        id: 'emergency-robbed',
        pt: 'Fui assaltado.',
        fr: 'Je me suis fait agresser et voler.',
        en: 'I’ve been robbed.',
        say: 'fouï a-ssaou-TA-dou',
        note: woman('assaltada'),
      },
      {
        id: 'emergency-phone',
        pt: 'Roubaram meu celular.',
        fr: 'On m’a volé mon portable.',
        en: 'My phone was stolen.',
        say: 'hô-BA-raon mêou ssé-lou-LA',
      },
      {
        id: 'emergency-passport',
        pt: 'Perdi meu passaporte.',
        fr: 'J’ai perdu mon passeport.',
        en: 'I lost my passport.',
        say: 'pèr-DJI mêou pa-ssa-POR-tchi',
      },
      {
        id: 'emergency-hospital',
        pt: 'Onde fica o hospital mais perto?',
        fr: 'Où est l’hôpital le plus proche ?',
        en: 'Where’s the nearest hospital?',
        say: 'ON-dji FI-ka ou ôs-pi-TAOU maïs PÈR-tou ?',
      },
      {
        id: 'emergency-language',
        pt: 'Eu não falo bem português.',
        fr: 'Je ne parle pas bien portugais.',
        en: 'I don’t speak Portuguese well.',
        say: 'éou naon FA-lou bein por-tou-GUÊS',
      },
    ],
  },
  {
    id: 'building',
    emoji: '🏢',
    title: { fr: 'Immeuble et voisins', en: 'Building and neighbors' },
    hint: { fr: 'Le porteiro, les colis, les petits soucis', en: 'The doorman, packages, small problems' },
    phrases: [
      {
        id: 'building-hello',
        pt: 'Bom dia, seu José!',
        fr: 'Bonjour, monsieur José !',
        en: 'Good morning, Mr. José!',
        say: 'bon DJI-a, ssêou jo-ZÉ !',
        note: {
          fr: '« Seu » (monsieur) et « dona » (madame) devant le prénom : comme on salue le porteiro ou une voisine.',
          en: '“Seu” (Mr.) and “dona” (Mrs.) before the first name: how you greet the doorman or a neighbor.',
        },
      },
      {
        id: 'building-live',
        pt: 'Eu moro no 802.',
        fr: 'J’habite au 802.',
        en: 'I live in 802.',
        say: 'éou MO-rou nou oï-tou-SSEN-tous i dôïs',
        note: {
          fr: 'On dit aussi les chiffres un par un : « oito zero dois ».',
          en: 'People also say the digits one by one: “oito zero dois”.',
        },
      },
      {
        id: 'building-package',
        pt: 'Chegou alguma encomenda pra mim?',
        fr: 'Un colis est arrivé pour moi ?',
        en: 'Has a package arrived for me?',
        say: 'ché-GÔ aou-GOU-ma in-ko-MEN-da pra min ?',
      },
      {
        id: 'building-friend',
        pt: 'Pode liberar a entrada do meu amigo?',
        fr: 'Vous pouvez laisser entrer mon ami ?',
        en: 'Can you let my friend in?',
        say: 'PO-dji li-bé-RA a in-TRA-da dou mêou a-MI-gou ?',
      },
      {
        id: 'building-key',
        pt: 'Esqueci a chave dentro de casa.',
        fr: 'J’ai oublié la clé à l’intérieur.',
        en: 'I left my key inside.',
        say: 'is-ké-SSI a CHA-vi DEN-trou dji KA-za',
      },
      {
        id: 'building-power',
        pt: 'A luz acabou.',
        fr: 'Il n’y a plus d’électricité.',
        en: 'The power went out.',
        say: 'a louss a-ka-BÔ',
      },
      {
        id: 'building-leak',
        pt: 'Tá vazando água no banheiro.',
        fr: 'Il y a une fuite d’eau dans la salle de bain.',
        en: 'There’s a water leak in the bathroom.',
        say: 'ta va-ZAN-dou A-goua nou ba-GNÊI-rou',
      },
      {
        id: 'building-elevator',
        pt: 'O elevador tá quebrado.',
        fr: 'L’ascenseur est en panne.',
        en: 'The elevator is broken.',
        say: 'ou é-lé-va-DÔ ta ké-BRA-dou',
      },
      {
        id: 'building-trash',
        pt: 'A que horas passa o caminhão do lixo?',
        fr: 'À quelle heure passe le camion-poubelle ?',
        en: 'What time does the garbage truck come?',
        say: 'a ki O-ras PA-ssa ou ka-mi-GNAON dou LI-chou ?',
      },
      {
        id: 'building-noise',
        pt: 'Desculpa o barulho!',
        fr: 'Désolé pour le bruit !',
        en: 'Sorry about the noise!',
        say: 'dis-KOU-pa ou ba-ROU-lyou !',
      },
      {
        id: 'building-party',
        pt: 'Vamos fazer uma festinha no sábado, tudo bem?',
        fr: 'On fait une petite fête samedi, ça vous va ?',
        en: 'We’re having a small party on Saturday, is that okay?',
        say: 'VA-mous fa-ZÊ OU-ma fès-TCHI-gna nou SSA-ba-dou, TOU-dou bein ?',
      },
    ],
  },
  {
    id: 'party',
    emoji: '🎉',
    title: { fr: 'Fêtes et amis', en: 'Parties and friends' },
    hint: { fr: 'Se présenter, sortir, garder le contact', en: 'Introducing yourself, going out, keeping in touch' },
    phrases: [
      {
        id: 'party-meet',
        pt: 'Prazer! Eu sou o Lucas.',
        fr: 'Enchanté ! Je m’appelle Lucas.',
        en: 'Nice to meet you! I’m Lucas.',
        say: 'pra-ZÊ ! éou ssô ou LOU-kas',
      },
      {
        id: 'party-french',
        pt: 'Sou francês, de Paris.',
        fr: 'Je suis français, de Paris.',
        en: 'I’m French, from Paris.',
        say: 'ssô fran-SSÊS, dji pa-RIS',
        note: woman('francesa'),
      },
      {
        id: 'party-from',
        pt: 'De onde você é?',
        fr: 'Tu viens d’où ?',
        en: 'Where are you from?',
        say: 'dji ON-dji vo-SÊ è ?',
      },
      {
        id: 'party-drink',
        pt: 'Bora tomar uma?',
        fr: 'On va boire un verre ?',
        en: 'Shall we grab a drink?',
        say: 'BO-ra to-MA OU-ma ?',
        note: {
          fr: '« Bora » vient de « vamos embora » (on y va). « Tomar uma » = boire une bière.',
          en: '“Bora” comes from “vamos embora” (let’s go). “Tomar uma” = have a beer.',
        },
      },
      {
        id: 'party-zap',
        pt: 'Me passa seu zap?',
        fr: 'Tu me donnes ton WhatsApp ?',
        en: 'Can I have your WhatsApp?',
        say: 'mi PA-ssa ssêou zap ?',
        note: { fr: 'Au Brésil, WhatsApp se dit « zap ».', en: 'In Brazil, WhatsApp is called “zap”.' },
      },
      {
        id: 'party-cool',
        pt: 'Que legal!',
        fr: 'Trop bien !',
        en: 'That’s cool!',
        say: 'ki lé-GAOU !',
      },
      {
        id: 'party-cheers',
        pt: 'Saúde!',
        fr: 'Santé !',
        en: 'Cheers!',
        say: 'ssa-OU-dji !',
      },
      {
        id: 'party-forro',
        pt: 'Você dança forró?',
        fr: 'Tu danses le forró ?',
        en: 'Do you dance forró?',
        say: 'vo-SÊ DAN-ssa fo-HO ?',
      },
      {
        id: 'party-friends',
        pt: 'Posso levar uns amigos?',
        fr: 'Je peux venir avec des amis ?',
        en: 'Can I bring some friends?',
        say: 'PO-ssou lé-VA ouns a-MI-gous ?',
      },
      {
        id: 'party-plan',
        pt: 'Vamos marcar alguma coisa!',
        fr: 'Il faut qu’on se voie !',
        en: 'Let’s hang out sometime!',
        say: 'VA-mous mar-KA aou-GOU-ma KOÏ-za !',
        note: {
          fr: 'Souvent dit par politesse : proposez une date si vous voulez vraiment vous revoir.',
          en: 'Often just polite: suggest a date if you really want to meet again.',
        },
      },
      {
        id: 'party-last',
        pt: 'Saideira!',
        fr: 'La dernière pour la route !',
        en: 'One last round!',
        say: 'ssaï-DÊI-ra !',
      },
      {
        id: 'party-home',
        pt: 'Tô cansado, vou pra casa.',
        fr: 'Je suis fatigué, je rentre.',
        en: 'I’m tired, I’m heading home.',
        say: 'tô kan-SSA-dou, vô pra KA-za',
        note: woman('cansada'),
      },
    ],
  },
  {
    id: 'university',
    emoji: '🎓',
    title: { fr: 'Université', en: 'University' },
    hint: { fr: 'En cours, avec les profs et les autres étudiants', en: 'In class, with teachers and classmates' },
    phrases: [
      {
        id: 'university-exchange',
        pt: 'Sou aluno de intercâmbio.',
        fr: 'Je suis étudiant en échange.',
        en: 'I’m an exchange student.',
        say: 'ssô a-LOU-nou dji in-tèr-KAN-biou',
        note: woman('aluna'),
      },
      {
        id: 'university-office',
        pt: 'Onde fica a secretaria?',
        fr: 'Où est le secrétariat ?',
        en: 'Where’s the administration office?',
        say: 'ON-dji FI-ka a ssé-kré-ta-RI-a ?',
      },
      {
        id: 'university-room',
        pt: 'Em que sala é a aula?',
        fr: 'Le cours est dans quelle salle ?',
        en: 'Which room is the class in?',
        say: 'ein ki SSA-la è a AOU-la ?',
      },
      {
        id: 'university-repeat',
        pt: 'Não entendi. Pode repetir?',
        fr: 'Je n’ai pas compris. Vous pouvez répéter ?',
        en: 'I didn’t get that. Could you repeat?',
        say: 'naon in-ten-DJI. PO-dji hé-pé-TCHI ?',
      },
      {
        id: 'university-slowly',
        pt: 'Pode falar mais devagar, por favor?',
        fr: 'Vous pouvez parler plus lentement, s’il vous plaît ?',
        en: 'Could you speak more slowly, please?',
        say: 'PO-dji fa-LA maïs dji-va-GA, pour fa-VÔ ?',
      },
      {
        id: 'university-exam',
        pt: 'Quando é a prova?',
        fr: 'C’est quand, l’examen ?',
        en: 'When is the exam?',
        say: 'KOUAN-dou è a PRO-va ?',
      },
      {
        id: 'university-english',
        pt: 'Posso fazer o trabalho em inglês?',
        fr: 'Je peux faire le projet en anglais ?',
        en: 'Can I do the assignment in English?',
        say: 'PO-ssou fa-ZÊ ou tra-BA-lyou ein in-GLÊS ?',
      },
      {
        id: 'university-together',
        pt: 'Vamos fazer o trabalho juntos?',
        fr: 'On fait le projet ensemble ?',
        en: 'Shall we do the assignment together?',
        say: 'VA-mous fa-ZÊ ou tra-BA-lyou JOUN-tous ?',
      },
      {
        id: 'university-wifi',
        pt: 'Qual é a senha do wi-fi?',
        fr: 'C’est quoi le mot de passe du wifi ?',
        en: 'What’s the wifi password?',
        say: 'kouaou è a SSÊ-gna dou ouaï-FAÏ ?',
      },
      {
        id: 'university-lunch',
        pt: 'Onde dá pra almoçar aqui perto?',
        fr: 'Où est-ce qu’on peut déjeuner près d’ici ?',
        en: 'Where can we have lunch near here?',
        say: 'ON-dji da pra aou-mo-SSA a-KI PÈR-tou ?',
      },
      {
        id: 'university-late',
        pt: 'Cheguei atrasado, desculpa.',
        fr: 'Je suis arrivé en retard, désolé.',
        en: 'I’m late, sorry.',
        say: 'ché-GUÊÏ a-tra-ZA-dou, dis-KOU-pa',
        note: woman('atrasada'),
      },
    ],
  },
  {
    id: 'bank',
    emoji: '💳',
    title: { fr: 'Banque et Pix', en: 'Banking and Pix' },
    hint: { fr: 'Payer, retirer de l’argent, envoyer un reçu', en: 'Paying, getting cash, sending a receipt' },
    phrases: [
      {
        id: 'bank-pix',
        pt: 'Pode ser no Pix?',
        fr: 'Je peux payer par Pix ?',
        en: 'Can I pay by Pix?',
        say: 'PO-dji ssê nou piks ?',
        note: {
          fr: 'Le Pix est le virement instantané brésilien, accepté presque partout.',
          en: 'Pix is Brazil’s instant transfer, accepted almost everywhere.',
        },
      },
      {
        id: 'bank-key',
        pt: 'Qual é a chave Pix?',
        fr: 'C’est quoi la clé Pix ?',
        en: 'What’s the Pix key?',
        say: 'kouaou è a CHA-vi piks ?',
      },
      {
        id: 'bank-receipt',
        pt: 'Te mando o comprovante no zap.',
        fr: 'Je t’envoie le reçu sur WhatsApp.',
        en: 'I’ll send you the receipt on WhatsApp.',
        say: 'tchi MAN-dou ou kon-pro-VAN-tchi nou zap',
      },
      {
        id: 'bank-total',
        pt: 'Quanto deu?',
        fr: 'Ça fait combien ?',
        en: 'How much is it?',
        say: 'KOUAN-tou dêou ?',
      },
      {
        id: 'bank-credit',
        pt: 'Pode passar no crédito?',
        fr: 'Vous pouvez le passer en crédit ?',
        en: 'Can you put it through as credit?',
        say: 'PO-dji pa-SSA nou KRÈ-dji-tou ?',
      },
      {
        id: 'bank-installments',
        pt: 'À vista ou parcelado?',
        fr: 'En une fois ou en plusieurs fois ?',
        en: 'In one payment or in installments?',
        say: 'a VIS-ta ou par-ssé-LA-dou ?',
        note: {
          fr: 'La question de la caisse : au Brésil, on paie souvent en plusieurs fois.',
          en: 'The cashier asks this: in Brazil, people often pay in installments.',
        },
      },
      {
        id: 'bank-declined',
        pt: 'Meu cartão não passou.',
        fr: 'Ma carte n’est pas passée.',
        en: 'My card didn’t go through.',
        say: 'mêou kar-TAON naon pa-SSÔ',
      },
      {
        id: 'bank-change',
        pt: 'Tem troco pra cinquenta?',
        fr: 'Vous avez la monnaie sur cinquante ?',
        en: 'Do you have change for fifty?',
        say: 'tein TRÔ-kou pra ssin-KOUEN-ta ?',
      },
      {
        id: 'bank-atm',
        pt: 'Onde tem um caixa eletrônico?',
        fr: 'Où est-ce qu’il y a un distributeur ?',
        en: 'Where is there an ATM?',
        say: 'ON-dji tein oun KAÏ-cha é-lé-TRÔ-ni-kou ?',
        note: {
          fr: 'Préférez les distributeurs à l’intérieur des banques ou des centres commerciaux.',
          en: 'Prefer ATMs inside banks or malls.',
        },
      },
      {
        id: 'bank-withdraw',
        pt: 'Queria sacar dinheiro.',
        fr: 'Je voudrais retirer de l’argent.',
        en: 'I’d like to withdraw cash.',
        say: 'ké-RI-a ssa-KA dji-GNÊI-rou',
      },
      {
        id: 'bank-account',
        pt: 'Queria abrir uma conta.',
        fr: 'Je voudrais ouvrir un compte.',
        en: 'I’d like to open an account.',
        say: 'ké-RI-a a-BRI OU-ma KON-ta',
      },
    ],
  },
];

export const ALL_PHRASES: Phrase[] = SITUATIONS.flatMap((s) => s.phrases);

export function getSituation(id: string | undefined): Situation | undefined {
  return SITUATIONS.find((s) => s.id === id);
}

/** The meaning in the student's language. */
export const meaning = (phrase: Phrase, lang: Lang) => phrase[lang];

/** Text-to-speech settings: Brazilian Portuguese, normal or slow. */
export const SPEECH_LANGUAGE = 'pt-BR';
export const SPEECH_RATE = { normal: 1, slow: 0.6 } as const;

/* ---------- Phrase of the day ---------- */

/** Situations taken in turn (one phrase of each, then the next one of each), so two days in a row differ. */
const DAILY_ORDER: { phrase: Phrase; situation: Situation }[] = (() => {
  const longest = Math.max(...SITUATIONS.map((s) => s.phrases.length));
  const order: { phrase: Phrase; situation: Situation }[] = [];
  for (let i = 0; i < longest; i++) {
    for (const situation of SITUATIONS) {
      const phrase = situation.phrases[i];
      if (phrase) order.push({ phrase, situation });
    }
  }
  return order;
})();

/** Same phrase all day long (the phone's calendar day), a new one the next day. */
export function phraseOfTheDay(date = new Date()) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return DAILY_ORDER[day % DAILY_ORDER.length];
}

/* ---------- Lesson ---------- */

export const LESSON_LENGTH = 5;

/** `toPt`: read the meaning, pick the Portuguese. `listen`: hear the Portuguese, pick the meaning. */
export type QuestionKind = 'toPt' | 'listen';
export type Question = { kind: QuestionKind; answer: Phrase; options: Phrase[] };

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Five questions from one situation, phrases not learned yet first; each with the right phrase and two
 * others of the same situation (shuffled). Three written questions and two listening ones, mixed; the
 * first is always written, so the audio only ever starts after a tap.
 */
export function buildLesson(situation: Situation, isLearned: (id: string) => boolean): Question[] {
  const fresh = shuffle(situation.phrases.filter((p) => !isLearned(p.id)));
  const known = shuffle(situation.phrases.filter((p) => isLearned(p.id)));
  const picked = shuffle([...fresh, ...known].slice(0, LESSON_LENGTH));
  const kinds: QuestionKind[] = ['toPt', ...shuffle<QuestionKind>(['toPt', 'toPt', 'listen', 'listen'])];
  return picked.map((answer, i) => ({
    kind: kinds[i % kinds.length],
    answer,
    options: shuffle([answer, ...shuffle(situation.phrases.filter((p) => p.id !== answer.id)).slice(0, 2)]),
  }));
}
