import type { Localized } from '@/lib/mock-data';

/**
 * Traditional dishes to try: Minas Gerais and the rest of Brazil.
 * Photos: chosen by the team, bundled in assets/dishes/ (one per dish, named after its id).
 * "Where to try" links only to places already in the app (restaurants, attractions, travel).
 */

export type DishRegion = 'mg' | 'br';
export type TryAt =
  { kind: 'restaurant'; id: string } | { kind: 'attraction'; id: string } | { kind: 'travel'; id: string };

type DishContent = {
  id: string;
  name: string;
  region: DishRegion;
  description: Localized;
  where: Localized;
  tryAt?: TryAt[];
};

const L = (fr: string, en: string): Localized => ({ fr, en });

const content: DishContent[] = [
  /* ---------- Minas Gerais ---------- */
  {
    id: 'pao-de-queijo',
    name: 'Pão de queijo',
    region: 'mg',
    description: L(
      'Le symbole du Minas : petites boules moelleuses au fromage, à base de farine de manioc. Au petit-déjeuner, au goûter, avec un café.',
      'The symbol of Minas: small chewy cheese bread balls made with cassava flour. For breakfast or a snack, with a coffee.',
    ),
    where: L(
      'Dans toutes les padarias et cafés, et au Mercado Central.',
      'In every bakery and café, and at the Mercado Central.',
    ),
    tryAt: [{ kind: 'attraction', id: 'mercado-central' }],
  },
  {
    id: 'queijo-canastra',
    name: 'Queijo canastra',
    region: 'mg',
    description: L(
      'Fromage de lait cru de la Serra da Canastra, primé internationalement. Du plus frais (« fresco ») au plus affiné (« curado »).',
      'Raw-milk cheese from the Serra da Canastra, internationally awarded. From fresh (“fresco”) to aged (“curado”).',
    ),
    where: L(
      'Au Mercado Central : on peut goûter avant d’acheter.',
      'At the Mercado Central: you can taste before buying.',
    ),
    tryAt: [
      { kind: 'attraction', id: 'mercado-central' },
      { kind: 'travel', id: 'canastra' },
    ],
  },
  {
    id: 'torresmo',
    name: 'Torresmo',
    region: 'mg',
    description: L(
      'Couenne de porc frite, croustillante dehors et fondante dedans : l’apéritif incontournable des botecos mineiros.',
      'Fried pork crackling, crunchy outside and tender inside: the must-have snack of Minas botecos.',
    ),
    where: L('Dans presque tous les botecos.', 'In almost every boteco.'),
    tryAt: [{ kind: 'restaurant', id: 'bar-da-lora' }],
  },
  {
    id: 'feijao-tropeiro',
    name: 'Feijão tropeiro',
    region: 'mg',
    description: L(
      'Haricots mélangés à la farine de manioc, au lard, aux œufs et au chou : le plat des anciens muletiers, devenu le classique des jours de match.',
      'Beans mixed with cassava flour, bacon, eggs and greens: the old mule drivers’ dish, now the classic of match days.',
    ),
    where: L(
      'Le plus célèbre est celui du Mineirão, les jours de match.',
      'The most famous one is at the Mineirão on match days.',
    ),
    tryAt: [{ kind: 'attraction', id: 'mineirao' }],
  },
  {
    id: 'tutu',
    name: 'Tutu à mineira',
    region: 'mg',
    description: L(
      'Purée de haricots épaissie à la farine de manioc, servie avec couve (chou vert), saucisse, œuf et torresmo.',
      'Bean purée thickened with cassava flour, served with couve (collard greens), sausage, egg and torresmo.',
    ),
    where: L('Dans les restaurants de cuisine mineira.', 'In Minas-food restaurants.'),
    tryAt: [
      { kind: 'restaurant', id: 'cozinha-tupis' },
      { kind: 'restaurant', id: 'candia' },
    ],
  },
  {
    id: 'frango-com-quiabo',
    name: 'Frango com quiabo',
    region: 'mg',
    description: L(
      'Poulet mijoté avec du gombo (quiabo), de l’ail et de l’oignon : un grand classique de la cuisine mineira, que l’on mange avec du riz.',
      'Chicken stewed with okra (quiabo), garlic and onion: a great classic of Minas cooking, eaten with rice.',
    ),
    where: L(
      'Dans les restaurants de cuisine mineira, comme le Trintaeum.',
      'In Minas-food restaurants, such as Trintaeum.',
    ),
    tryAt: [{ kind: 'restaurant', id: 'trintaeum' }],
  },
  {
    id: 'vaca-atolada',
    name: 'Vaca atolada',
    region: 'mg',
    description: L(
      'Côtes de bœuf mijotées longtemps avec du manioc jusqu’à former un ragoût épais : un plat réconfortant des soirs froids.',
      'Beef ribs slow-cooked with cassava into a thick stew: a comforting dish for cold evenings.',
    ),
    where: L(
      'Dans les restaurants de cuisine mineira, surtout en hiver.',
      'In Minas-food restaurants, especially in winter.',
    ),
    tryAt: [{ kind: 'restaurant', id: 'cozinha-tupis' }],
  },
  {
    id: 'doce-de-leite',
    name: 'Doce de leite',
    region: 'mg',
    description: L(
      'Confiture de lait mineira, en pot crémeux ou en barre plus dure. Excellente avec du fromage.',
      'Minas milk caramel, creamy in a jar or firmer in bars. Excellent with cheese.',
    ),
    where: L(
      'Au Mercado Central et dans les épiceries fines.',
      'At the Mercado Central and in delicatessens.',
    ),
    tryAt: [{ kind: 'attraction', id: 'mercado-central' }],
  },
  {
    id: 'cachaca',
    name: 'Cachaça',
    region: 'mg',
    description: L(
      'L’eau-de-vie de canne à sucre. Le Minas est réputé pour ses cachaças artisanales, vieillies dans différents bois brésiliens.',
      'Sugar cane spirit. Minas is famous for its craft cachaças, aged in different Brazilian woods.',
    ),
    where: L(
      'Dégustations au Mercado Central ; à boire avec modération.',
      'Tastings at the Mercado Central; drink responsibly.',
    ),
    tryAt: [{ kind: 'attraction', id: 'mercado-central' }],
  },

  /* ---------- Brasil ---------- */
  {
    id: 'coxinha',
    name: 'Coxinha',
    region: 'br',
    description: L(
      'Croquette en forme de goutte, farcie de poulet effiloché et de requeijão. Le snack le plus populaire du Brésil.',
      'A teardrop-shaped croquette filled with shredded chicken and requeijão. Brazil’s most popular snack.',
    ),
    where: L('Dans toutes les padarias et lanchonetes.', 'In every bakery and snack bar.'),
  },
  {
    id: 'pastel',
    name: 'Pastel',
    region: 'br',
    description: L(
      'Grand chausson frit et croustillant, farci de viande, de fromage ou de palmito, avec un caldo de cana (jus de canne) à côté.',
      'A large crispy fried pastry filled with meat, cheese or palm heart, with a caldo de cana (sugar cane juice) on the side.',
    ),
    where: L(
      'Sur les marchés de rue, comme la Feira Hippie le dimanche.',
      'At street markets, like the Feira Hippie on Sundays.',
    ),
    tryAt: [{ kind: 'attraction', id: 'feira-hippie' }],
  },
  {
    id: 'acaraje',
    name: 'Acarajé',
    region: 'br',
    description: L(
      'Beignet de haricots frit dans l’huile de dendê, garni de vatapá et de crevettes, préparé par les baianas en tenue traditionnelle.',
      'Bean fritter fried in dendê oil, filled with vatapá and shrimp, made by baianas in traditional dress.',
    ),
    where: L(
      'À Salvador, dans les tabuleiros des baianas (demandez « quente » si vous aimez le piment).',
      'In Salvador, at the baianas’ stalls (ask for “quente” if you like it spicy).',
    ),
    tryAt: [{ kind: 'travel', id: 'salvador' }],
  },
  {
    id: 'feijoada',
    name: 'Feijoada',
    region: 'br',
    description: L(
      'Le plat national : haricots noirs mijotés avec différentes viandes de porc, servis avec riz, couve, farofa et orange.',
      'The national dish: black beans slow-cooked with different pork cuts, served with rice, couve, farofa and orange.',
    ),
    where: L(
      'Traditionnellement le samedi midi, dans beaucoup de restaurants et de botecos.',
      'Traditionally on Saturday lunchtime, in many restaurants and botecos.',
    ),
  },
  {
    id: 'churrasco',
    name: 'Churrasco',
    region: 'br',
    description: L(
      'Le barbecue brésilien : viandes grillées à la braise, avec la picanha comme reine. En churrascaria, les serveurs passent avec les broches.',
      'Brazilian barbecue: meat grilled over embers, with picanha as the queen cut. In a churrascaria, waiters come round with the skewers.',
    ),
    where: L(
      'En churrascaria ou dans les restaurants de grillades.',
      'In a churrascaria or a grill restaurant.',
    ),
    tryAt: [{ kind: 'restaurant', id: 'osso' }],
  },
  {
    id: 'moqueca',
    name: 'Moqueca',
    region: 'br',
    description: L(
      'Ragoût de poisson ou de crevettes cuit dans une marmite en terre. À Bahia avec lait de coco et huile de dendê ; à Espírito Santo, plus léger.',
      'Fish or shrimp stew cooked in a clay pot. In Bahia with coconut milk and dendê oil; in Espírito Santo, lighter.',
    ),
    where: L(
      'Dans les restaurants de cuisine bahianaise ou capixaba, et bien sûr à Salvador.',
      'In Bahian or Capixaba restaurants, and of course in Salvador.',
    ),
    tryAt: [{ kind: 'travel', id: 'salvador' }],
  },
  {
    id: 'acai',
    name: 'Açaí na tigela',
    region: 'br',
    description: L(
      'Purée glacée de baies d’açaí d’Amazonie, servie dans un bol avec banane, granola et lait concentré. Parfait après le sport.',
      'Frozen purée of Amazonian açaí berries, served in a bowl with banana, granola and condensed milk. Perfect after sport.',
    ),
    where: L(
      'Dans les lanchonetes d’açaí, presque à chaque coin de rue.',
      'In açaí shops, on almost every street corner.',
    ),
  },
  {
    id: 'brigadeiro',
    name: 'Brigadeiro',
    region: 'br',
    description: L(
      'Petite truffe de lait concentré et de chocolat roulée dans des vermicelles : le bonbon de toutes les fêtes d’anniversaire.',
      'A small truffle of condensed milk and chocolate rolled in sprinkles: the sweet of every birthday party.',
    ),
    where: L('Dans les docerias et les pâtisseries.', 'In sweet shops and bakeries.'),
  },
  {
    id: 'caipirinha',
    name: 'Caipirinha',
    region: 'br',
    description: L(
      'Le cocktail national : cachaça, citron vert écrasé, sucre et glace. Existe aussi aux fruits (fruit de la passion, mandarine et autres).',
      'The national cocktail: cachaça, crushed lime, sugar and ice. Also made with other fruits (passion fruit, tangerine and more).',
    ),
    where: L(
      'Dans tous les botecos ; essayez celle à la mandarine du Bar da Lora.',
      'In every boteco; try the tangerine one at Bar da Lora.',
    ),
    tryAt: [{ kind: 'restaurant', id: 'bar-da-lora' }],
  },
];

/** Team-chosen photos, bundled with the app. */
const photos: Record<string, number> = {
  'pao-de-queijo': require('@/assets/dishes/pao-de-queijo.jpg'),
  'queijo-canastra': require('@/assets/dishes/queijo-canastra.jpg'),
  torresmo: require('@/assets/dishes/torresmo.jpg'),
  'feijao-tropeiro': require('@/assets/dishes/feijao-tropeiro.jpg'),
  tutu: require('@/assets/dishes/tutu.jpg'),
  'frango-com-quiabo': require('@/assets/dishes/frango-com-quiabo.jpg'),
  'vaca-atolada': require('@/assets/dishes/vaca-atolada.jpg'),
  'doce-de-leite': require('@/assets/dishes/doce-de-leite.jpg'),
  cachaca: require('@/assets/dishes/cachaca.jpg'),
  coxinha: require('@/assets/dishes/coxinha.jpg'),
  pastel: require('@/assets/dishes/pastel.jpg'),
  acaraje: require('@/assets/dishes/acaraje.jpg'),
  feijoada: require('@/assets/dishes/feijoada.jpg'),
  churrasco: require('@/assets/dishes/churrasco.jpg'),
  moqueca: require('@/assets/dishes/moqueca.jpg'),
  acai: require('@/assets/dishes/acai.jpg'),
  brigadeiro: require('@/assets/dishes/brigadeiro.jpg'),
  caipirinha: require('@/assets/dishes/caipirinha.jpg'),
};

export const dishes = content.map((d) => ({ ...d, photo: photos[d.id] }));
export type Dish = (typeof dishes)[number];
