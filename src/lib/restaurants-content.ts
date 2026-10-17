import type { Localized } from '@/lib/mock-data';

/**
 * Editorial content for the recommended restaurants, written by the team.
 * Facts (address, hours, rating, phone…) come from Google via scripts/restaurants.py.
 * Dish names stay in their original language: that's what students will read on the menu.
 */

export type GoodFor =
  | 'date'
  | 'friends'
  | 'celebration'
  | 'lunch'
  | 'drinks'
  | 'wine'
  | 'groups'
  | 'solo'
  | 'local';

export type RestaurantContent = {
  cuisine: Localized;
  description: Localized;
  mustTry: string[];
  goodFor: GoodFor[];
  tip?: Localized;
  /** Google has no price level for a few places: set by the team (1–4). */
  priceLevel?: number;
};

export const restaurantContent: Record<string, RestaurantContent> = {
  /* ---------- Pour une occasion ---------- */

  glouton: {
    cuisine: { fr: 'Franco-mineira', en: 'French-Minas' },
    description: {
      fr: 'Mené par le chef primé Léo Paixão, le Glouton est un bistrot rustique-chic qui applique la technique française à la cuisine réconfortante du Minas. Cuisine ouverte et menus de saison mettent en valeur les fromages locaux, le porc et les légumes racines. Lumière chaude, service impeccable : une destination pour les voyageurs gourmets, régulièrement classée parmi les meilleures tables du Brésil.',
      en: 'Led by award-winning chef Léo Paixão, Glouton is a rustic-chic bistro that brings French technique to Minas comfort food. The open kitchen and seasonal menus celebrate local cheeses, pork and root vegetables. Warm lighting and impeccable service make it a destination for food lovers, and it is regularly ranked among the best restaurants in Brazil.',
    },
    mustTry: ['Guioza de pato', 'Arroz de galinha com quiabo', 'Bacalhau'],
    goodFor: ['celebration', 'date', 'local'],
    tip: { fr: 'Réservez à l’avance : les tables partent vite.', en: 'Book ahead: tables fill fast.' },
  },

  parallel: {
    cuisine: { fr: 'Espagnole', en: 'Spanish' },
    description: {
      fr: 'Le Parallel apporte les saveurs espagnoles à Belo Horizonte avec élégance et précision. Créé par des chefs formés à Barcelone, il propose des tapas créatives, des riz aux fruits de mer et des assiettes franches et maîtrisées. Les olives explosives et le riz « señorito » montrent à la fois la technique et la personnalité de la maison. Salle minimaliste mais chaleureuse, idéale pour dîner sans se presser.',
      en: 'Parallel brings Spanish flavors to Belo Horizonte with elegance and precision. Created by chefs trained in Barcelona, it offers creative tapas, seafood rice dishes and bold, well-crafted plates. Highlights like the exploding olives and “señorito” rice show both technique and personality. The space is minimalist yet warm, ideal for slow dinners.',
    },
    mustTry: ['Olivas explosivas', 'Arroz señorito', 'Patatas bravas', 'Croqueta con melón', 'Pulpo'],
    goodFor: ['date', 'friends', 'wine'],
    tip: {
      fr: 'Le samedi, service continu toute la journée : pratique pour un déjeuner tardif.',
      en: 'Open all day on Saturdays: handy for a late lunch.',
    },
  },

  pacato: {
    cuisine: { fr: 'Mineira contemporaine', en: 'Contemporary Minas' },
    description: {
      fr: 'L’une des expériences les plus abouties de BH, connue pour ses relectures raffinées des produits régionaux. La petite salle tamisée crée une ambiance calme, presque méditative. Les assiettes sont dressées avec précision et le menu dégustation paraît presque européen… jusqu’à ce que les saveurs du Minas prennent le dessus. Discret, réfléchi et profondément satisfaisant.',
      en: 'One of BH’s most thoughtful culinary experiences, known for refined takes on regional ingredients. The small, dimly lit dining room creates a quiet, almost meditative mood. Dishes are plated with precision, and the tasting menu often feels more European than Brazilian, until the flavors hit. Discreet, intentional and deeply satisfying.',
    },
    mustTry: ['Menu degustação harmonizado', 'Pão de milho com requeijão', 'Entrada de cogumelos'],
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
    mustTry: ['Bolinho de feijão fradinho', 'Frango com quiabo', 'Degustação de queijos mineiros'],
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
    mustTry: ['Menu degustação', 'Harmonização de vinhos'],
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
    mustTry: ['Polvo com banana', 'Picles da casa', 'Drinks autorais'],
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
      fr: 'Une cuisine italienne contemporaine à la sensibilité européenne : pâtes maison, assiettes soignées et belle carte des vins, dans une maison rustique avec jardin. L’ambiance est douce et romantique, élégante sans être guindée. Un choix sûr pour impressionner… ou simplement se faire plaisir.',
      en: 'Contemporary Italian cooking with a European sensibility: homemade pasta, beautiful plating and an excellent wine list, in a rustic house with a garden. The mood is soft and romantic, elegant but not stuffy. A reliable choice when you want to impress, or simply relax.',
    },
    mustTry: ['Carpaccio', 'Massas da casa'],
    goodFor: ['date', 'celebration', 'wine'],
    tip: {
      fr: 'À la Pampulha, loin du centre : prévoyez un Uber. Attente de 30 min fréquente le week-end.',
      en: 'In Pampulha, far from the center: plan an Uber. Expect a 30-minute wait on weekends.',
    },
  },

  okinaki: {
    cuisine: { fr: 'Fusion japonaise-coréenne', en: 'Japanese-Korean fusion' },
    description: {
      fr: 'Une fusion japonaise-coréenne moderne et soignée, axée sur des plats sains et colorés : poke bowls, sushis, banchan. Rapide, frais, idéal pour un repas décontracté mais un cran au-dessus. Le décor minimaliste attire une clientèle jeune, surtout au déjeuner et en début de soirée. On peut aussi y aller juste pour grignoter et boire un verre.',
      en: 'Sleek, modern Japanese-Korean fusion focused on healthy, colorful dishes like poke bowls, sushi and banchan. Fast, fresh and ideal for casual yet elevated dining. The minimalist design attracts a young crowd, especially at lunch and early dinner. You can also just go for snacks and drinks.',
    },
    mustTry: ['Gyoza', 'Poke bowl', 'Sushi'],
    goodFor: ['friends', 'lunch', 'drinks'],
    tip: {
      fr: 'Se remplit vite : arrivez vers 18h30 ou réservez.',
      en: 'Fills up fast: arrive around 6:30 PM or book.',
    },
  },

  nino: {
    cuisine: { fr: 'Italienne', en: 'Italian' },
    description: {
      fr: 'Comme une trattoria romaine : pâtes fraîches, parfum d’huile d’olive et lumière chaude et intime. Assez simple pour un dîner en semaine, assez spécial pour un rendez-vous. Les cacio e pepe et tagliatelle al ragù font l’unanimité. Service rapide et sympathique, carte des vins surtout italienne, avec un vin maison au bon rapport qualité-prix.',
      en: 'Like stepping into a Roman trattoria: handmade pasta, olive oil aromas and warm, intimate lighting. Casual enough for weekday dinners, special enough for a date. Cacio e pepe and tagliatelle al ragù are consistently praised. Fast, friendly service, an Italian-leaning wine list and a good-value house wine.',
    },
    mustTry: ['Cacio e pepe', 'Tagliatelle al ragù', 'Dolce ai Lamponi (drink sem álcool)'],
    goodFor: ['date', 'friends', 'lunch'],
    tip: {
      fr: 'Réservez, ça se remplit vite. Menu exécutif le midi en semaine.',
      en: 'Book, it fills fast. Executive lunch menu on weekdays.',
    },
  },

  maru: {
    cuisine: { fr: 'Japonaise-brésilienne', en: 'Japanese-Brazilian' },
    description: {
      fr: 'Le Marú mêle saveurs brésiliennes et influence japonaise dans une carte pensée pour le partage : cocktails audacieux, ingrédients tropicaux, poissons très frais. La clientèle est jeune et animée, surtout le week-end. Énergie et élégance à la fois : parfait pour un anniversaire, un dîner de groupe ou une soirée festive.',
      en: 'Marú blends Brazilian flavors with Japanese influence in a menu designed for sharing: bold cocktails, tropical ingredients and very fresh fish. The crowd is young and lively, especially on weekends. Energy meets elegance: perfect for birthdays, group dinners or a festive evening out.',
    },
    mustTry: ['Pipoca de camarão', 'Nhoque de banana-da-terra com atum selado', 'Trio de peixes', 'Tempurá de milho'],
    goodFor: ['friends', 'celebration', 'drinks', 'groups'],
    tip: { fr: 'Pas donné, mais ça vaut le coup.', en: 'Not cheap, but worth it.' },
  },

  osso: {
    cuisine: { fr: 'Viandes grillées', en: 'Grill & steaks' },
    description: {
      fr: 'Le paradis des amateurs de viande : pièces grillées, côtes avec l’os et sauces maison, dans un cadre rustique-contemporain. Tout, des boissons aux accompagnements, est pensé pour mettre en valeur la viande. Venez avec faim : la picanha se partage facilement à deux.',
      en: 'A paradise for meat lovers: grilled cuts, bone-in steaks and house sauces in a rustic-contemporary room. Everything, from drinks to sides, is designed to match the main attraction: the meat. Go hungry: the picanha easily serves two.',
    },
    mustTry: ['Picanha (para dois)', 'Risoto piemontese'],
    goodFor: ['friends', 'groups'],
    tip: {
      fr: 'Le service peut être lent quand la salle est pleine : évitez si vous êtes pressé.',
      en: 'Service can be slow when it is full: skip it if you are in a hurry.',
    },
  },

  villeon: {
    cuisine: { fr: 'Contemporaine', en: 'Contemporary' },
    description: {
      fr: 'Entre classique et contemporain, le Villeon ressemble à un petit village franco-italien. Plats réconfortants réinventés, salle chic et discrète, belle carte de vins et de cocktails. Le chef passe volontiers saluer les tables. Élégant sans être froid : un favori des gourmets locaux.',
      en: 'Between classic and contemporary, Villeon feels like a small French-Italian village. Reimagined comfort dishes, a chic and understated room, and a lovely wine and cocktail list. The chef often stops by the tables. Elegant without being cold: a favorite among food-savvy locals.',
    },
    mustTry: ['Pasteizinhos de brie'],
    goodFor: ['date', 'celebration', 'wine'],
    tip: { fr: 'Quartier Luxemburgo, un peu excentré : Uber conseillé.', en: 'In Luxemburgo, a bit out of the way: take an Uber.' },
    priceLevel: 3,
  },

  patria: {
    cuisine: { fr: 'Brésilienne', en: 'Brazilian' },
    description: {
      fr: 'Le Pátria célèbre les produits brésiliens avec une touche moderne et épurée : herbes, légumes et viandes locales, dressés de façon contemporaine. Pas expérimental à l’excès, mais chaque plat est réfléchi et de saison. Cadre serein, un peu formel, idéal pour un dîner lent. Les desserts sont particulièrement réussis.',
      en: 'Pátria celebrates Brazilian ingredients with a clean, modern touch: local herbs, produce and cuts plated in a contemporary style. Not overly experimental, but every dish is intentional and seasonal. A serene, slightly formal setting for slow dinners. Desserts are a highlight.',
    },
    mustTry: ['Filé mignon', 'Régua de sobremesas', 'Torta com sorvete'],
    goodFor: ['celebration', 'date', 'local'],
    tip: { fr: 'Au Belvedere, loin du centre : Uber conseillé.', en: 'In Belvedere, far from the center: take an Uber.' },
  },

  'rex-bibendi': {
    cuisine: { fr: 'Bar à vins', en: 'Wine bar' },
    description: {
      fr: 'Un bar à vins intime au charme fou. On commande au verre ou on explore de petits producteurs, avec fromages, charcuteries et petites assiettes. Ambiance romantique mais sans prétention : musique douce, lumière tamisée et équipe qui connaît ses vins. Parfait pour un premier rendez-vous ou une longue conversation.',
      en: 'An intimate wine bar with charm in every corner. Order by the glass or explore small producers, with cheeses, cured meats and small plates. Romantic but unpretentious: soft music, low lights and knowledgeable staff. Perfect for first dates or long talks.',
    },
    mustTry: ['Flight de vinhos', 'Almoço executivo'],
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
    mustTry: ['Carbonara com guanciale', 'Menu 4 tempos'],
    goodFor: ['date', 'friends', 'wine'],
    tip: {
      fr: 'Réservation possible directement par WhatsApp. Le samedi soir, petite attente dans un espace confortable.',
      en: 'You can book on WhatsApp. Short wait on Saturday nights, in a comfortable waiting area.',
    },
  },

  barolio: {
    cuisine: { fr: 'Italienne & vins', en: 'Italian & wine' },
    description: {
      fr: 'Le Barolio offre une ambiance rustique et stylée de bar à vins italien : planches de charcuterie, fromages et pâtes, avec une large sélection de vins. Murs de brique et lumière de bougies : fait pour les soirées cosy et les bonnes conversations.',
      en: 'Barolio brings a rustic yet stylish Italian wine bar feel: charcuterie boards, cheeses and pasta with a wide range of wines. Brick walls and candlelight make it ideal for cozy nights and good conversation.',
    },
    mustTry: ['Tábua de frios e queijos', 'Massas'],
    goodFor: ['date', 'wine', 'friends'],
    tip: { fr: 'Petite salle : liste d’attente fréquente le soir.', en: 'Small room: there is often a waiting list at night.' },
  },

  amado: {
    cuisine: { fr: 'Brésilienne', en: 'Brazilian' },
    description: {
      fr: 'Du groupe Amado, réputé à BH : une cuisine brésilienne réconfortante dans un cadre raffiné, à Lourdes. Fruits de mer frais et savoureux, présentation soignée mais accessible. Bois et lumière naturelle : entre élégant et chaleureux. Idéal pour découvrir les saveurs brésiliennes dans un contexte un peu plus chic.',
      en: 'From the well-known Amado group: Brazilian comfort food in a refined setting in Lourdes. Fresh, flavorful seafood and thoughtful but approachable plating. Wood accents and natural light strike a balance between elegant and homey. Great for trying Brazilian flavors in an upscale context.',
    },
    mustTry: ['Bolinho de cupim', 'Frutos do mar'],
    goodFor: ['date', 'friends', 'local'],
    tip: { fr: 'Musique live certains soirs.', en: 'Live music on some nights.' },
  },

  'casa-calixto': {
    cuisine: { fr: 'Contemporaine', en: 'Contemporary' },
    description: {
      fr: 'Haute gastronomie dans un superbe manoir rénové de la Savassi : viandes, poissons et fruits de mer bien servis, cocktails soignés et service souvent décrit comme exceptionnel. Le cadre est très photogénique. Pas bon marché, mais l’un des meilleurs rapports qualité-prix parmi les adresses chics.',
      en: 'Fine dining in a beautifully restored mansion in Savassi: generous meat, fish and seafood dishes, well-made cocktails and service often described as exceptional. Very photogenic setting. Not cheap, but one of the best value-for-money options among upscale places.',
    },
    mustTry: ['Entrada de camarão', 'Peixes e frutos do mar'],
    goodFor: ['celebration', 'date', 'drinks'],
    tip: {
      fr: 'Voiturier sur place. Droit de bouchon élevé si vous apportez votre vin.',
      en: 'Valet parking. High corkage fee if you bring your own wine.',
    },
  },

  'el-mai': {
    cuisine: { fr: 'Contemporaine (mexicaine, italienne, japonaise)', en: 'Contemporary (Mexican, Italian, Japanese)' },
    description: {
      fr: 'Un restaurant au décor moderne avec une carte qui sort des sentiers battus, entre influences mexicaines, italiennes et japonaises. Prix justes pour le quartier, cadre beau et soigné. Une adresse à explorer en plusieurs visites.',
      en: 'A modern-looking restaurant with an unusual menu mixing Mexican, Italian and Japanese influences. Fair prices for the area and a beautiful, well-kept room. A place to explore over several visits.',
    },
    mustTry: ['Berinjela', 'Vieiras'],
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
    mustTry: ['Tagliatelle cacio e pepe', 'Crostini de gorgonzola', 'Bife de chorizo na brasa'],
    goodFor: ['date', 'celebration', 'friends'],
  },

  domenico: {
    cuisine: { fr: 'Pizzeria & trattoria', en: 'Pizzeria & trattoria' },
    description: {
      fr: 'Pizzeria et trattoria élégante de la Savassi, avec une très longue carte de plats italiens traditionnels, de pizzas et de vins sélectionnés. Les restrictions alimentaires sont indiquées sur le menu. Les plats sont généreux et se partagent facilement.',
      en: 'An elegant pizzeria and trattoria in Savassi, with a very long menu of traditional Italian dishes, pizzas and selected wines. Dietary restrictions are marked on the menu. Portions are generous and easy to share.',
    },
    mustTry: ['Carpaccio ai tartufo', 'Lasanha', 'Pizzas'],
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
    mustTry: ['Galinhada', 'Nhoque de baroa', 'Tempurá de milho', 'Franguinho com paçoca'],
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
    mustTry: ['Língua de boi com purê de couve-flor', 'Fígado com jiló', 'Rabada com batata', 'Caipirinha de tangerina'],
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
    mustTry: ['Carpaccio', 'Risoto de mignon com funghi', 'Costela à caipira'],
    goodFor: ['date', 'friends', 'groups'],
  },

  odoya: {
    cuisine: { fr: 'Brésilienne', en: 'Brazilian' },
    description: {
      fr: 'Dans une jolie maison ancienne de la Savassi avec plusieurs petites salles sur trois niveaux et une véranda. Cuisine brésilienne de produits frais, très bonnes entrées à partager et jus naturels : ici, pas de sodas, seulement de la « vraie nourriture ». Une table commune est proposée à ceux qui viennent seuls.',
      en: 'In a charming old house in Savassi with several small rooms on three levels and a porch. Fresh Brazilian cooking, great starters to share and natural juices: no sodas here, only “real food”. A communal table is offered to solo diners.',
    },
    mustTry: ['Risoto de moqueca', 'Peixe do dia', 'Guioza', 'Sucos naturais'],
    goodFor: ['lunch', 'date', 'solo'],
    tip: { fr: 'Réservez aux heures de pointe.', en: 'Book at peak times.' },
  },

  'dona-fulo': {
    cuisine: { fr: 'Nordestine', en: 'Northeastern Brazilian' },
    description: {
      fr: 'Un voyage dans le Nordeste brésilien sans quitter Lourdes : décor thématique, musique de là-bas et cuisine fidèle aux épices de la région. Carte variée, prix justes et accueil chaleureux du début à la fin. Goûtez aussi les sodas typiques du Nordeste.',
      en: 'A trip to Brazil’s Northeast without leaving Lourdes: themed décor, regional music and cooking true to the region’s spices. Varied menu, fair prices and a warm welcome throughout. Try the Northeastern sodas too.',
    },
    mustTry: ['Carne de sol', 'Refrigerante nordestino'],
    goodFor: ['friends', 'groups', 'lunch'],
    tip: { fr: 'Arrivez tôt : la salle se remplit vite.', en: 'Arrive early: it fills up quickly.' },
  },

  'hou-mei': {
    cuisine: { fr: 'Asiatique (coréenne, chinoise)', en: 'Asian (Korean, Chinese)' },
    description: {
      fr: 'Souvent cité comme la meilleure adresse asiatique de BH : barbecue coréen, lamen, plats sautés, avec beaucoup de choix et de saveur. Salle propre et agréable, musique basse pour discuter, service aux petits soins.',
      en: 'Often called the best Asian spot in BH: Korean barbecue, ramen and stir-fries, with plenty of choice and flavor. Clean, pleasant room, low music for conversation and very caring service.',
    },
    mustTry: ['Churrasco coreano (porco ou boi)', 'Topokki', 'Arroz frito', 'Lamen'],
    goodFor: ['friends', 'date', 'lunch'],
    tip: { fr: 'Les animaux sont acceptés.', en: 'Pet friendly.' },
  },

  'stadt-jever': {
    cuisine: { fr: 'Allemande', en: 'German' },
    description: {
      fr: 'Une institution de BH : un pub allemand au décor rustique, avec des plats typiques et des bières artisanales. Les serveurs sont expérimentés et l’ambiance chaleureuse : parfait pour une soirée bière entre amis.',
      en: 'A BH institution: a German pub with rustic décor, classic dishes and craft beers. Experienced waiters and a warm atmosphere: perfect for a beer night with friends.',
    },
    mustTry: ['Pratos típicos alemães', 'Cervejas artesanais'],
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
    mustTry: ['Dadinhos de queijo coalho com pesto', 'Croquete de costela', 'Hambúrguer da casa'],
    goodFor: ['friends', 'date', 'drinks', 'solo'],
    tip: {
      fr: 'Santa Tereza est un peu loin : Uber conseillé, et profitez-en pour découvrir le quartier.',
      en: 'Santa Tereza is a bit far: take an Uber and explore the neighborhood.',
    },
  },

  'james-burger': {
    cuisine: { fr: 'Burgers', en: 'Burgers' },
    description: {
      fr: 'Burgers artisanaux aux noms de « James » célèbres (James Bond, James Dean…) dans un décor thématique rock et décontracté. Viande bien cuite, pain très moelleux, option végétarienne et jeux de société en libre accès en attendant.',
      en: 'Craft burgers named after famous “James” (James Bond, James Dean…) in a relaxed, rock-themed space. Well-cooked patties, very soft buns, a vegetarian option and free board games while you wait.',
    },
    mustTry: ['James Caviezel', 'James Bond', 'Opção vegetariana'],
    goodFor: ['friends', 'solo', 'groups'],
  },

  'maurizio-gallo': {
    cuisine: { fr: 'Italienne', en: 'Italian' },
    description: {
      fr: 'Cuisine italienne traditionnelle avec des pâtes maison, dans un cadre rustique et familial. Le chef Maurizio passe souvent en salle pour conseiller. Les portions sont très généreuses et l’accueil chaleureux.',
      en: 'Traditional Italian cooking with homemade pasta in a rustic, family-style setting. Chef Maurizio often comes out to make suggestions. Very generous portions and a warm welcome.',
    },
    mustTry: ['Rigatoni', 'Burrata', 'Gnocchi com filé mignon', 'Amatriciana com ossobuco', 'Panna cotta'],
    goodFor: ['date', 'friends', 'lunch'],
    tip: {
      fr: 'Un plat suffit souvent pour deux. Le dimanche midi, c’est plein et le service ralentit.',
      en: 'One dish often feeds two. Sunday lunch is busy and service slows down.',
    },
  },

  'indian-gourmet': {
    cuisine: { fr: 'Indienne', en: 'Indian' },
    description: {
      fr: 'Un restaurant indien tenu par une famille indienne, simple et chaleureux, qui fait découvrir la culture du pays. Pour changer de la cuisine brésilienne : naan, currys et riz au safran.',
      en: 'An Indian restaurant run by an Indian family, simple and welcoming, sharing the country’s culture. A good change from Brazilian food: naan, curries and saffron rice.',
    },
    mustTry: ['Butter chicken', 'Pão naan', 'Arroz de açafrão'],
    goodFor: ['lunch', 'friends', 'solo'],
    tip: {
      fr: 'Menu exécutif le midi : l’à la carte est copieux pour une seule personne. Salle parfois chaude.',
      en: 'Executive lunch menu at midday: à la carte is a lot for one. The room can get warm.',
    },
  },

  candia: {
    cuisine: { fr: 'Mineira', en: 'Minas food' },
    description: {
      fr: 'Un bar-restaurant au joli décor dans le quartier du Prado, avec une cuisine mineira bien assaisonnée, de bons cocktails et souvent de la musique live. Carte variée et prix très corrects, surtout le midi.',
      en: 'A nicely decorated bar-restaurant in Prado, serving well-seasoned Minas food, good cocktails and often live music. Varied menu and very fair prices, especially at lunch.',
    },
    mustTry: ['Pastel de queijo canastra com cebola agridoce', 'Menu executivo do almoço'],
    goodFor: ['local', 'lunch', 'friends'],
    tip: {
      fr: 'Menu exécutif (entrée, plat, dessert) à petit prix le midi en semaine.',
      en: 'Cheap executive menu (starter, main, dessert) on weekday lunchtimes.',
    },
  },

  'baxo-bar': {
    cuisine: { fr: 'Bar', en: 'Bar' },
    description: {
      fr: 'Un bar très agréable pour une fin d’après-midi ou une soirée entre amis : bons cocktails, petits plats et ambiance animée. L’adresse à montrer à vos amis de passage à BH.',
      en: 'A lovely bar for late afternoons or nights out with friends: good cocktails, small plates and a lively crowd. The place to take friends visiting BH.',
    },
    mustTry: ['Drinks autorais', 'Petiscos'],
    goodFor: ['drinks', 'friends', 'celebration'],
    tip: {
      fr: 'Plutôt bar que restaurant. Vérifiez l’addition : le service est parfois compté à chaque paiement.',
      en: 'More bar than restaurant. Check the bill: the service charge is sometimes added to each payment.',
    },
  },
};
