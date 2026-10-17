import type { Localized } from '@/lib/mock-data';

/**
 * Editorial content for the recommended restaurants, written by the team.
 * Facts (address, hours, rating, phone…) come from Google via scripts/restaurants.py.
 */

export type GoodFor =
  'date' | 'friends' | 'celebration' | 'lunch' | 'drinks' | 'wine' | 'groups' | 'solo' | 'local';

export type RestaurantContent = {
  cuisine: Localized;
  description: Localized;
  goodFor: GoodFor[];
  tip?: Localized;
  /** Google has no price level for a few places: set by the team (1–4). */
  priceLevel?: number;
  /**
   * Official website checked by hand when Google's is wrong or dead (audit 2026-10-17).
   * `null` hides the website row.
   */
  website?: string | null;
};

export const restaurantContent: Record<string, RestaurantContent> = {
  /* ---------- Pour une occasion ---------- */

  glouton: {
    cuisine: { fr: 'Franco-mineira', en: 'French-Minas' },
    description: {
      fr: 'Le restaurant du chef Léo Paixão, l’un des plus reconnus du Brésil : une cuisine franco-mineira sophistiquée et créative, dans une maison élégante aux touches rustiques. Classé au Top 100 Brésil 2026.',
      en: 'Chef Léo Paixão’s restaurant, one of Brazil’s best known: sophisticated, creative French-Minas cooking in an elegant house with rustic touches. Ranked in Brazil’s Top 100 for 2026.',
    },
    goodFor: ['celebration', 'date', 'local'],
    tip: { fr: 'Réservez à l’avance : les tables partent vite.', en: 'Book ahead: tables fill fast.' },
  },

  parallel: {
    cuisine: { fr: 'Espagnole', en: 'Spanish' },
    description: {
      fr: 'Cuisine espagnole à Lourdes, ouverte par Gabriella Guimarães et Guilherme Furtado après sept ans à Barcelone (les mêmes chefs que l’Ōkinaki). Tapas créatives, riz cuits à la braise et paella, à partager. Classé au Top 100 Brésil 2026. Salle minimaliste mais chaleureuse, idéale pour dîner sans se presser.',
      en: 'Spanish cooking in Lourdes, opened by Gabriella Guimarães and Guilherme Furtado after seven years in Barcelona (the same chefs as Ōkinaki). Creative tapas, rice dishes and paella, to share. Ranked in Brazil’s Top 100 for 2026. A minimalist yet warm room, ideal for slow dinners.',
    },
    goodFor: ['date', 'friends', 'wine'],
    tip: {
      fr: 'Le samedi, service continu de 12 h 30 à 23 h : pratique pour un déjeuner tardif.',
      en: 'On Saturdays it’s open non-stop from 12:30 PM to 11 PM: handy for a late lunch.',
    },
  },

  pacato: {
    cuisine: { fr: 'Mineira contemporaine', en: 'Contemporary Minas' },
    description: {
      fr: '« Cuisine mineira en mouvement » du chef Caio Soter : les produits et les savoir-faire du Minas (porc, poulet, maïs, manioc, gombo, jiló) revisités avec liberté. Menu dégustation le soir, menu exécutif plus abordable au déjeuner. Classé au Top 100 Brésil 2026.',
      en: '“Minas cooking in motion” by chef Caio Soter: Minas ingredients and techniques (pork, chicken, corn, cassava, okra, jiló) reinterpreted freely. Tasting menu at night, a more affordable executive menu at lunch. Ranked in Brazil’s Top 100 for 2026.',
    },
    goodFor: ['celebration', 'date', 'local'],
    tip: {
      fr: 'Le menu exécutif du déjeuner permet de découvrir la maison pour bien moins cher que le dîner.',
      en: 'The executive lunch menu is a much cheaper way to try it than dinner.',
    },
  },

  trintaeum: {
    cuisine: { fr: 'Mineira d’auteur', en: 'Modern Minas' },
    description: {
      fr: 'Meilleur restaurant du Minas Gerais au classement Casual EXAME 2026. Le nom fait référence à l’indicatif téléphonique de l’État (31) : ici, tout vient du Minas, des ingrédients à la décoration en passant par une carte des vins 100 % mineira. On vous accueille avec un biscoito de polvilho, et le service est très souvent salué.',
      en: 'Ranked best restaurant in Minas Gerais by Casual EXAME 2026. The name refers to the state’s area code (31): everything here comes from Minas, from ingredients and décor to an all-Minas wine list. You are welcomed with a biscoito de polvilho, and the service is widely praised.',
    },
    goodFor: ['celebration', 'date', 'local'],
    tip: {
      fr: 'Réservez, surtout le samedi : sans réservation, peu de chances d’avoir une table.',
      en: 'Book, especially on Saturdays: without a reservation you are unlikely to get a table.',
    },
  },

  'per-lui': {
    cuisine: { fr: 'Menu dégustation', en: 'Tasting menu' },
    description: {
      fr: 'Le seul restaurant de BH qui ne sert qu’un menu dégustation, renouvelé tous les trois mois. Vaisselle, dressage et design : chaque assiette est pensée comme une petite œuvre, avec un travail poussé sur la maturation des viandes et des poissons. Une expérience technique et créative, à réserver pour une vraie grande occasion.',
      en: 'The only restaurant in BH that serves a tasting menu only, renewed every three months. Tableware, plating and design: each course is treated as a small artwork, with real work on dry-aging meat and fish. A technical, creative experience to keep for a truly special occasion.',
    },
    goodFor: ['celebration', 'date'],
    tip: {
      fr: 'C’est cher (comptez plus de R$ 600 par personne avec les vins) et les portions sont petites.',
      en: 'It is expensive (over R$ 600 per person with wine pairing) and portions are small.',
    },
  },

  birosca: {
    cuisine: { fr: 'Mineira affective', en: 'Minas comfort food' },
    description: {
      fr: 'Un « boteco alternatif » au décor coloré façon maison de grand-mère des années 60–70, avec des lustres vintage et des classiques de la musique brésilienne. La cheffe Bruna Martins revisite la cuisine mineira affective avec une touche contemporaine et de très bons cocktails. Classé au Top 100 Brésil 2026.',
      en: 'An “alternative boteco” with colorful, grandma’s-house décor from the 60s–70s, vintage chandeliers and Brazilian classics playing. Chef Bruna Martins gives Minas comfort food a contemporary twist, with great cocktails. Ranked in Brazil’s Top 100 for 2026.',
    },
    goodFor: ['friends', 'drinks', 'local'],
    tip: {
      fr: 'Plats assez chers pour la quantité : l’idéal est de partager plusieurs assiettes.',
      en: 'Dishes are pricey for the size: best to share several plates.',
    },
    priceLevel: 3,
  },

  anella: {
    cuisine: { fr: 'Italienne', en: 'Italian' },
    description: {
      fr: 'Bistrô italien de pâtes maison, dans un cadre rustique avec jardin, côté Pampulha. Ambiance romantique et belle sélection de vins. Très demandé : il y a souvent une file d’attente.',
      en: 'An Italian bistro of homemade pasta in a rustic setting with a garden, out towards Pampulha. A romantic mood and a good wine selection. Very popular: there is often a queue.',
    },
    goodFor: ['date', 'celebration', 'wine'],
    tip: {
      fr: 'À la Pampulha, loin du centre : prévoyez un Uber. Attente de 30 min fréquente le week-end.',
      en: 'In Pampulha, far from the center: plan an Uber. Expect a 30-minute wait on weekends.',
    },
  },

  okinaki: {
    cuisine: { fr: 'Japonaise et coréenne', en: 'Japanese and Korean' },
    description: {
      fr: 'Bar et restaurant aux influences japonaises et coréennes, des mêmes chefs que le Parallel : sushis, gyozas, kimchi et petites assiettes créatives. On peut y dîner ou simplement grignoter avec un verre. Clientèle jeune, salle qui se remplit vite.',
      en: 'A bar and restaurant with Japanese and Korean influences, from the same chefs as Parallel: sushi, gyoza, kimchi and creative small plates. Come for dinner or just snacks and a drink. A young crowd, and the room fills up fast.',
    },
    goodFor: ['friends', 'drinks', 'date'],
    tip: {
      fr: 'Se remplit vite : arrivez vers 18 h 30 ou réservez.',
      en: 'Fills up fast: arrive around 6:30 PM or book.',
    },
  },

  nino: {
    cuisine: { fr: 'Italienne', en: 'Italian' },
    description: {
      fr: 'L’adresse de BH du Nino Cucina, une trattoria italienne née à São Paulo : pâtes fraîches et classiques italiens dans une salle chaleureuse. Assez simple pour un dîner en semaine, assez spéciale pour un rendez-vous. Vin maison au bon rapport qualité-prix.',
      en: 'The BH branch of Nino Cucina, an Italian trattoria born in São Paulo: fresh pasta and Italian classics in a warm room. Casual enough for a weekday dinner, special enough for a date. Good-value house wine.',
    },
    goodFor: ['date', 'friends', 'lunch'],
    tip: {
      fr: 'Réservez, ça se remplit vite. Les réservations passent par la centrale du groupe (numéro de São Paulo).',
      en: 'Book, it fills fast. Bookings go through the group’s central line (a São Paulo number).',
    },
    website: 'https://alifenino.com.br/nino/',
  },

  maru: {
    cuisine: { fr: 'Japonaise-brésilienne', en: 'Japanese-Brazilian' },
    description: {
      fr: 'Bar japonais de la Savassi : poissons très frais, petites assiettes créatives et bons cocktails. Ambiance animée, surtout le week-end.',
      en: 'A Japanese bar in Savassi: very fresh fish, creative small plates and good cocktails. A lively atmosphere, especially at weekends.',
    },
    goodFor: ['friends', 'celebration', 'drinks', 'groups'],
    tip: { fr: 'Pas donné, mais ça vaut le coup.', en: 'Not cheap, but worth it.' },
  },

  osso: {
    cuisine: { fr: 'Parrilla', en: 'Parrilla grill' },
    description: {
      fr: 'Spécialiste de la parrilla à Lourdes : pièces de bœuf Angus et Wagyu grillées, côtes et accompagnements, dans un cadre rustique-contemporain. La picanha se partage facilement à deux.',
      en: 'A parrilla specialist in Lourdes: Angus and Wagyu beef cuts grilled over the fire, ribs and sides, in a rustic-contemporary room. The picanha easily serves two.',
    },
    goodFor: ['friends', 'groups'],
    tip: {
      fr: 'Le service peut être lent quand la salle est pleine : évitez si vous êtes pressé.',
      en: 'Service can be slow when it is full: skip it if you are in a hurry.',
    },
  },

  villeon: {
    cuisine: { fr: 'Contemporaine', en: 'Contemporary' },
    description: {
      fr: 'Entre classique et contemporain, le Villeon ressemble à un petit village franco-italien. Plats réconfortants revisités, salle chic et accueillante, belle carte de vins et de cocktails. Un favori des gourmets locaux.',
      en: 'Between classic and contemporary, Villeon feels like a small French-Italian village. Reimagined comfort dishes, a chic and welcoming room, and a lovely wine and cocktail list. A favourite among food-savvy locals.',
    },
    goodFor: ['date', 'celebration', 'wine'],
    tip: {
      fr: 'Quartier Luxemburgo, un peu excentré : Uber conseillé.',
      en: 'In Luxemburgo, a bit out of the way: take an Uber.',
    },
    priceLevel: 3,
  },

  patria: {
    cuisine: { fr: 'Brésilienne', en: 'Brazilian' },
    description: {
      fr: 'Cuisine brésilienne au Belvedere, dans un grand espace qui accueille aussi des événements. Service attentionné et desserts particulièrement réussis.',
      en: 'Brazilian cooking in Belvedere, in a large space that also hosts events. Attentive service and particularly good desserts.',
    },
    goodFor: ['celebration', 'date', 'local'],
    tip: {
      fr: 'Au Belvedere, loin du centre : Uber conseillé.',
      en: 'In Belvedere, far from the center: take an Uber.',
    },
  },

  'rex-bibendi': {
    cuisine: { fr: 'Bar à vins', en: 'Wine bar' },
    description: {
      fr: 'Restaurant et bar à vins à quelques rues de la Savassi : belle carte des vins, dégustations en « flight » et cuisine soignée. Au déjeuner, un menu exécutif qui change chaque semaine.',
      en: 'A restaurant and wine bar near Savassi: a fine wine list, wine flights and careful cooking. At lunch, an executive menu that changes every week.',
    },
    goodFor: ['date', 'wine', 'lunch'],
    tip: {
      fr: 'Déjeuner exécutif (entrée, plat, dessert) qui change chaque semaine. Les petites tables partent vite le soir.',
      en: 'Executive lunch (starter, main, dessert) changes every week. Small tables fill fast at night.',
    },
  },

  'est-est-est': {
    cuisine: { fr: 'Italienne', en: 'Italian' },
    description: {
      fr: 'Une trattoria italienne traditionnelle avec une touche moderne, installée dans une maison aux nombreuses petites salles. Les pâtes sont la vraie raison de venir, à commencer par une carbonara au guanciale dans les règles. Accueil chaleureux et service attentif, même quand la maison est pleine.',
      en: 'A traditional Italian trattoria with a modern touch, set in a house with several small dining rooms. Pasta is the real reason to come, starting with a proper guanciale carbonara. Warm welcome and attentive service, even when it is full.',
    },
    goodFor: ['date', 'friends', 'wine'],
    tip: {
      fr: 'Réservation possible directement par WhatsApp. Le samedi soir, petite attente dans un espace confortable.',
      en: 'You can book on WhatsApp. Short wait on Saturday nights, in a comfortable waiting area.',
    },
  },

  barolio: {
    cuisine: { fr: 'Pizzeria napolitaine', en: 'Neapolitan pizzeria' },
    description: {
      fr: 'Pizzeria napolitaine de la Savassi : pizzas individuelles à pâte fermentée 48 heures, farines et mozzarella de bufflonne importées d’Italie, plus des pâtes et des desserts italiens. Élue meilleure pizzeria de BH par la revue Encontro.',
      en: 'A Neapolitan pizzeria in Savassi: individual pizzas with 48-hour fermented dough, flour and buffalo mozzarella imported from Italy, plus pasta and Italian desserts. Voted best pizzeria in BH by Encontro magazine.',
    },
    goodFor: ['friends', 'date'],
    tip: {
      fr: 'Petite salle : liste d’attente fréquente le soir.',
      en: 'Small room: there is often a waiting list at night.',
    },
    website: 'https://barolio.com.br/',
  },

  amado: {
    cuisine: { fr: 'Brésilienne contemporaine', en: 'Contemporary Brazilian' },
    description: {
      fr: 'Cuisine brésilienne contemporaine du chef Robson Viana, à Lourdes : produits brésiliens dans des assiettes soignées, comme le filet à la sauce de jabuticaba ou le risotto aux crevettes et gombo. Cadre moderne et accueillant.',
      en: 'Contemporary Brazilian cooking by chef Robson Viana in Lourdes: Brazilian ingredients on well-crafted plates, like filet in jabuticaba sauce or shrimp and okra risotto. A modern, welcoming room.',
    },
    goodFor: ['date', 'friends', 'local'],
    tip: { fr: 'Musique live certains soirs.', en: 'Live music on some nights.' },
    website: 'https://www.instagram.com/amadolourdesbh/',
  },

  'casa-calixto': {
    cuisine: { fr: 'Contemporaine', en: 'Contemporary' },
    description: {
      fr: 'Haute gastronomie dans un superbe manoir rénové de la Savassi : viandes, poissons et fruits de mer bien servis, cocktails soignés et service souvent décrit comme exceptionnel. Le cadre est très photogénique. Pas bon marché, mais l’un des meilleurs rapports qualité-prix parmi les adresses chics.',
      en: 'Fine dining in a beautifully restored mansion in Savassi: generous meat, fish and seafood dishes, well-made cocktails and service often described as exceptional. Very photogenic setting. Not cheap, but one of the best value-for-money options among upscale places.',
    },
    goodFor: ['celebration', 'date', 'drinks'],
    tip: {
      fr: 'Voiturier sur place. Droit de bouchon élevé si vous apportez votre vin.',
      en: 'Valet parking. High corkage fee if you bring your own wine.',
    },
  },

  'el-mai': {
    cuisine: {
      fr: 'Contemporaine (mexicaine, italienne, japonaise)',
      en: 'Contemporary (Mexican, Italian, Japanese)',
    },
    description: {
      fr: 'Un restaurant au décor moderne avec une carte qui sort des sentiers battus, entre influences mexicaines, italiennes et japonaises. Prix justes pour le quartier, cadre beau et soigné. Une adresse à explorer en plusieurs visites.',
      en: 'A modern-looking restaurant with an unusual menu mixing Mexican, Italian and Japanese influences. Fair prices for the area and a beautiful, well-kept room. A place to explore over several visits.',
    },
    goodFor: ['friends', 'date', 'groups'],
    tip: {
      fr: 'Carte très variée : idéal quand le groupe n’arrive pas à se mettre d’accord. Le service peut être lent quand c’est plein.',
      en: 'Very varied menu: ideal when the group cannot agree. Service can be slow when it is full.',
    },
  },

  ninita: {
    cuisine: { fr: 'Italienne', en: 'Italian' },
    description: {
      fr: 'La maison italienne du chef Léo Paixão (le même que le Glouton), à la même adresse. Des plats généreux et très bien présentés, une terrasse et une salle climatisée. Une façon un peu plus décontractée de goûter la cuisine d’un des chefs les plus reconnus du Brésil.',
      en: 'Chef Léo Paixão’s Italian restaurant (the same chef as Glouton), at the same address. Generous, beautifully plated dishes, a terrace and an air-conditioned room. A slightly more relaxed way to taste the food of one of Brazil’s best-known chefs.',
    },
    goodFor: ['date', 'celebration', 'friends'],
  },

  domenico: {
    cuisine: { fr: 'Pizzeria & trattoria', en: 'Pizzeria & trattoria' },
    description: {
      fr: 'Pizzeria et trattoria élégante de la Savassi, avec une très longue carte de plats italiens traditionnels, de pizzas et de vins sélectionnés. Les restrictions alimentaires sont indiquées sur le menu. Les plats sont généreux et se partagent facilement.',
      en: 'An elegant pizzeria and trattoria in Savassi, with a very long menu of traditional Italian dishes, pizzas and selected wines. Dietary restrictions are marked on the menu. Portions are generous and easy to share.',
    },
    goodFor: ['friends', 'groups', 'date'],
    tip: {
      fr: 'Sans réservation, attendez-vous à faire la queue.',
      en: 'Without a reservation, expect a queue.',
    },
  },

  /* ---------- Au quotidien ---------- */

  'cozinha-tupis': {
    cuisine: { fr: 'Mineira', en: 'Minas food' },
    description: {
      fr: 'Pionnier de la renaissance du Mercado Novo, la Cozinha Tupis revisite les plats typiques de Belo Horizonte dans une ambiance décontractée et créative. Classée au Top 100 Brésil 2026, c’est la meilleure façon de goûter la vraie cuisine de BH sans se ruiner. La place la plus demandée : le comptoir face à la cuisine.',
      en: 'A pioneer of Mercado Novo’s revival, Cozinha Tupis reinvents Belo Horizonte’s classic dishes in a relaxed, creative setting. Ranked in Brazil’s Top 100 for 2026, it is the best way to taste real BH food without breaking the bank. The most wanted seat: the counter facing the kitchen.',
    },
    goodFor: ['local', 'lunch', 'friends'],
    tip: {
      fr: 'Dans le Mercado Novo (Centro). Réservez le comptoir, surtout le samedi midi. Profitez-en pour visiter le marché.',
      en: 'Inside Mercado Novo (Centro). Book the counter, especially for Saturday lunch, and explore the market.',
    },
  },

  'bar-da-lora': {
    cuisine: { fr: 'Boteco mineiro', en: 'Minas boteco' },
    description: {
      fr: 'Au cœur des bars de la Savassi, le Bar da Lora sert la cuisine de boteco mineira dans les règles : petits plats généreux, bière bien fraîche et prix corrects. Petite salle et tables sur le trottoir. Passage obligé pour comprendre la culture des bars de BH.',
      en: 'In the heart of Savassi’s bar scene, Bar da Lora serves proper Minas boteco food: generous small plates, ice-cold beer and fair prices. A small room plus sidewalk tables. A must to understand BH’s bar culture.',
    },
    goodFor: ['friends', 'local', 'drinks'],
    tip: {
      fr: 'Évitez midi–13h : l’attente peut être très longue.',
      en: 'Avoid noon–1 PM: the wait can be very long.',
    },
  },

  'gastro-hub': {
    cuisine: { fr: 'Italienne & brésilienne', en: 'Italian & Brazilian' },
    description: {
      fr: 'Un restaurant chaleureux et très photogénique sur l’Avenida do Contorno, avec une cuisine réconfortante entre Italie et Brésil : risottos, pâtes, viandes. Portions généreuses, service attentionné et ambiance musicale agréable.',
      en: 'A cozy, very photogenic restaurant on Avenida do Contorno, serving comfort food between Italy and Brazil: risottos, pasta and meat. Generous portions, attentive service and nice background music.',
    },
    goodFor: ['date', 'friends', 'groups'],
  },

  odoya: {
    cuisine: { fr: 'Brésilienne', en: 'Brazilian' },
    description: {
      fr: 'Dans une jolie maison ancienne de la Savassi, avec plusieurs petites salles et une véranda. Cuisine brésilienne de produits frais, très bonnes entrées à partager et jus naturels. Une table commune accueille ceux qui viennent seuls.',
      en: 'In a charming old house in Savassi, with several small rooms and a porch. Fresh Brazilian cooking, great starters to share and natural juices. A communal table welcomes solo diners.',
    },
    goodFor: ['lunch', 'date', 'solo'],
    tip: { fr: 'Réservez aux heures de pointe.', en: 'Book at peak times.' },
  },

  'dona-fulo': {
    cuisine: { fr: 'Nordestine', en: 'Northeastern Brazilian' },
    description: {
      fr: 'Un voyage dans le Nordeste brésilien sans quitter Lourdes : décor thématique, musique de là-bas et cuisine fidèle aux épices de la région. Carte variée, prix justes et accueil chaleureux du début à la fin. Goûtez aussi les sodas typiques du Nordeste.',
      en: 'A trip to Brazil’s Northeast without leaving Lourdes: themed décor, regional music and cooking true to the region’s spices. Varied menu, fair prices and a warm welcome throughout. Try the Northeastern sodas too.',
    },
    goodFor: ['friends', 'groups', 'lunch'],
    tip: { fr: 'Arrivez tôt : la salle se remplit vite.', en: 'Arrive early: it fills up quickly.' },
  },

  'hou-mei': {
    cuisine: { fr: 'Asiatique (coréenne, chinoise)', en: 'Asian (Korean, Chinese)' },
    description: {
      fr: 'Une adresse asiatique très appréciée : barbecue coréen, lamen, plats sautés, avec beaucoup de choix et de saveur. Salle propre et agréable, musique basse pour discuter, service attentionné.',
      en: 'A much-loved Asian spot: Korean barbecue, ramen and stir-fries, with plenty of choice and flavour. A clean, pleasant room, low music for conversation and attentive service.',
    },
    goodFor: ['friends', 'date', 'lunch'],
  },

  'stadt-jever': {
    cuisine: { fr: 'Allemande', en: 'German' },
    description: {
      fr: 'Une institution de BH : un pub allemand au décor rustique, avec des plats typiques et des bières artisanales. Les serveurs sont expérimentés et l’ambiance chaleureuse : parfait pour une soirée bière entre amis.',
      en: 'A BH institution: a German pub with rustic décor, classic dishes and craft beers. Experienced waiters and a warm atmosphere: perfect for a beer night with friends.',
    },
    goodFor: ['friends', 'groups', 'drinks'],
    tip: {
      fr: 'Restez sur la cuisine allemande : les burgers ne sont pas leur point fort.',
      en: 'Stick to the German dishes: burgers are not their strong point.',
    },
  },

  'esquina-sante': {
    cuisine: { fr: 'Variée', en: 'Varied' },
    description: {
      fr: 'Dans une belle maison éclectique de Santa Tereza, le quartier bohème de BH. Bonne cuisine, carte de cocktails et de vins bien choisie, équipe très gentille. Aussi bien pour un rendez-vous que pour une soirée entre amis ou un match à la télé.',
      en: 'In a beautiful eclectic house in Santa Tereza, BH’s bohemian neighborhood. Good food, a well-chosen cocktail and wine list and a very friendly team. Works for a date, a night out with friends or watching a game.',
    },
    goodFor: ['friends', 'date', 'drinks', 'solo'],
    tip: {
      fr: 'Santa Tereza est un peu loin : Uber conseillé, et profitez-en pour découvrir le quartier.',
      en: 'Santa Tereza is a bit far: take an Uber and explore the neighborhood.',
    },
  },

  /* ---------- Hambúrgueres ---------- */

  sal15: {
    cuisine: { fr: 'Burgers artisanaux', en: 'Craft burgers' },
    description: {
      fr: 'L’une des hamburgueries les plus primées de BH, au Prado : burgers artisanaux aux recettes originales, viande juteuse et pain moelleux. Présente dans le classement des 50 meilleurs burgers du Brésil début 2026. Tables à l’intérieur et en terrasse.',
      en: 'One of BH’s most awarded burger spots, in Prado: craft burgers with original recipes, juicy patties and soft buns. In the Brazil’s 50 best burgers ranking in early 2026. Tables indoors and outside.',
    },
    goodFor: ['friends', 'groups'],
    tip: { fr: 'Il y a souvent de l’attente aux heures de pointe.', en: 'Expect a wait at peak times.' },
  },

  nimbos: {
    cuisine: { fr: 'Burgers et bar', en: 'Burgers and bar' },
    description: {
      fr: 'Bar à burgers de la Savassi, ouvert en 2017 par le chef Luli Moreira. Élu 1er burger du Brésil au Burger Fest 2024 et 2e dans l’édition suivante. Tables sur le trottoir, ambiance très « BH », bonne musique.',
      en: 'A burger bar in Savassi, opened in 2017 by chef Luli Moreira. Voted Brazil’s best burger at Burger Fest 2024 and runner-up the following edition. Tables on the sidewalk, a very “BH” vibe, good music.',
    },
    goodFor: ['friends', 'drinks', 'groups'],
    tip: {
      fr: 'Le vendredi soir, comptez une attente d’environ 30 minutes.',
      en: 'On Friday nights, expect a wait of about 30 minutes.',
    },
  },

  'ferris-burger': {
    cuisine: { fr: 'Burgers artisanaux', en: 'Craft burgers' },
    description: {
      fr: 'Hamburgerie artisanale de la Savassi, au cœur du quartier : viande juteuse bien saisie, ingrédients dosés avec soin et service rapide. Dans le classement national Hambúrguer Perfeito 2026. Cadre accueillant et confortable.',
      en: 'A craft burger spot in the heart of Savassi: juicy, well-seared patties, carefully balanced ingredients and quick service. In the national Hambúrguer Perfeito 2026 ranking. A cosy, comfortable room.',
    },
    goodFor: ['friends', 'solo', 'lunch'],
  },

  'juicy-burger': {
    cuisine: { fr: 'Burgers', en: 'Burgers' },
    description: {
      fr: 'Petite hamburgerie de Lourdes à l’ambiance fast-food, très aimée des habitués : burgers savoureux, frites généreuses avec du cheddar, option poulet.',
      en: 'A small burger shop in Lourdes with a fast-food feel, much loved by regulars: tasty burgers, generous cheddar fries, a chicken option.',
    },
    goodFor: ['friends', 'solo'],
    tip: {
      fr: 'Venez tôt : le vendredi soir, la file d’attente peut dépasser 30 minutes.',
      en: 'Come early: on Friday nights the queue can run past 30 minutes.',
    },
    website: 'https://www.instagram.com/juicyburgershop/',
  },

  'american-bulls': {
    cuisine: { fr: 'Burgers américains', en: 'American burgers' },
    description: {
      fr: 'Hamburgerie d’inspiration américaine, plébiscitée par le public au Burger Fest. L’adresse de Silveira est spacieuse et bien décorée, avec une carte variée et de très bonnes frites. Il y a une autre adresse à la Pampulha.',
      en: 'An American-style burger joint, voted a public favourite at Burger Fest. The Silveira branch is spacious and nicely decorated, with a varied menu and very good fries. There is another branch in Pampulha.',
    },
    goodFor: ['friends', 'groups'],
  },

  foraster: {
    cuisine: { fr: 'Burgers gourmets', en: 'Gourmet burgers' },
    description: {
      fr: 'Une maison transformée en hamburgerie, à Cidade Nova : recettes créatives et ingrédients plus sophistiqués que la moyenne, cadre chaleureux, accueil attentionné de la propriétaire. Meilleures frites du Burger Fest. Idéal pour un dîner plus soigné.',
      en: 'A house turned into a burger restaurant, in Cidade Nova: creative recipes and more sophisticated ingredients than usual, a warm setting and attentive hosting by the owner. Best fries at Burger Fest. Ideal for a more special dinner.',
    },
    goodFor: ['date', 'friends', 'celebration'],
    tip: {
      fr: 'Ouvert le soir seulement, du mardi au dimanche.',
      en: 'Open evenings only, Tuesday to Sunday.',
    },
  },

  meatz: {
    cuisine: { fr: 'Burgers', en: 'Burgers' },
    description: {
      fr: 'Chaîne de burgers, avec une adresse au Centro Sul : on commande sur une borne, tables à l’intérieur et en terrasse, frites croustillantes. Très noté par plus de 4 000 clients Google. Une valeur sûre pour un burger rapide.',
      en: 'A burger chain with a branch in Centro Sul: you order at a kiosk, with tables indoors and outside and crispy fries. Highly rated by over 4,000 Google reviewers. A safe bet for a quick burger.',
    },
    goodFor: ['friends', 'lunch', 'solo'],
  },

  'james-burger': {
    cuisine: { fr: 'Burgers artisanaux', en: 'Craft burgers' },
    description: {
      fr: 'Burgers artisanaux aux noms de célèbres « James » (James Bond, James Dean…), dans un espace thématique décontracté avec du rock en fond. Pain très moelleux, option végétarienne et jeux de société offerts en attendant.',
      en: 'Craft burgers named after famous “James” (James Bond, James Dean…) in a relaxed, themed space with rock in the background. Very soft buns, a vegetarian option and free games while you wait.',
    },
    goodFor: ['friends', 'solo', 'groups'],
    website: null,
  },

  'eddie-fine': {
    cuisine: { fr: 'Burgers classiques', en: 'Classic burgers' },
    description: {
      fr: 'Hamburgerie historique de BH, dans un décor façon années 1950 : gros burgers, frites, onion rings et milk-shakes. L’adresse de Lourdes, la « Casa Amarela », a une grande terrasse arborée.',
      en: 'A BH burger institution in a 1950s-style diner setting: big burgers, fries, onion rings and milkshakes. The Lourdes branch, the “Casa Amarela”, has a large leafy terrace.',
    },
    goodFor: ['friends', 'groups', 'local'],
    tip: {
      fr: 'Les plats sont individuels : le milk-shake Nutella, lui, se partage à deux.',
      en: 'Dishes are individual: the Nutella milkshake, though, serves two.',
    },
  },

  'maurizio-gallo': {
    cuisine: { fr: 'Italienne', en: 'Italian' },
    description: {
      fr: 'Cuisine italienne traditionnelle avec des pâtes maison, dans un cadre rustique et familial. Le chef Maurizio passe souvent en salle pour conseiller. Les portions sont très généreuses et l’accueil chaleureux.',
      en: 'Traditional Italian cooking with homemade pasta in a rustic, family-style setting. Chef Maurizio often comes out to make suggestions. Very generous portions and a warm welcome.',
    },
    goodFor: ['date', 'friends', 'lunch'],
    tip: {
      fr: 'Un plat suffit souvent pour deux. Le dimanche midi, c’est plein et le service ralentit.',
      en: 'One dish often feeds two. Sunday lunch is busy and service slows down.',
    },
  },

  'indian-gourmet': {
    cuisine: { fr: 'Indienne', en: 'Indian' },
    description: {
      fr: 'Un restaurant indien simple et chaleureux, à Lourdes. Pour changer de la cuisine brésilienne : naan, currys et riz au safran.',
      en: 'A simple, welcoming Indian restaurant in Lourdes. A good change from Brazilian food: naan, curries and saffron rice.',
    },
    goodFor: ['lunch', 'friends', 'solo'],
    tip: {
      fr: 'Menu exécutif le midi : l’à la carte est copieux pour une seule personne.',
      en: 'Executive lunch menu at midday: à la carte is a lot for one.',
    },
  },

  candia: {
    cuisine: { fr: 'Mineira', en: 'Minas food' },
    description: {
      fr: 'Un bar-restaurant au joli décor dans le quartier du Prado, avec une cuisine mineira bien assaisonnée, de bons cocktails et souvent de la musique live. Carte variée et prix très corrects, surtout le midi.',
      en: 'A nicely decorated bar-restaurant in Prado, serving well-seasoned Minas food, good cocktails and often live music. Varied menu and very fair prices, especially at lunch.',
    },
    goodFor: ['local', 'lunch', 'friends'],
    tip: {
      fr: 'Menu exécutif (entrée, plat, dessert) à petit prix le midi.',
      en: 'Cheap executive menu (starter, main, dessert) at lunchtime.',
    },
  },

  'baxo-bar': {
    cuisine: { fr: 'Bar', en: 'Bar' },
    description: {
      fr: 'Un bar très agréable pour une fin d’après-midi ou une soirée entre amis : bons cocktails, petits plats et ambiance animée.',
      en: 'A lovely bar for late afternoons or nights out with friends: good cocktails, small plates and a lively crowd.',
    },
    goodFor: ['drinks', 'friends', 'celebration'],
    tip: {
      fr: 'Plutôt bar que restaurant : idéal pour un apéro.',
      en: 'More bar than restaurant: perfect for drinks.',
    },
  },
};
