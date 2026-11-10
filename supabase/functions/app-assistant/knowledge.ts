// GERADO por scripts/assistant/build.mjs a partir do conteúdo do app. Não editar à mão.
export const KNOWLEDGE = `## Où trouver chaque chose dans l’app (noms des écrans et des boutons : français / anglais ; le reste de cette base est en français)
- Barre du bas : « Accueil / Home », « Explorer / Explore », le bouton rouge de Charlotte au centre, « Maison / House », « Séjour / My stay ».
- En haut de chaque onglet. Vos initiales : profil et langue FR/EN. La cloche : les avis de l’équipe. « Profil / Profile » : « Mon profil pour les colocs / My profile for roommates », « Langue / Language », « Nous contacter / Contact us », « Se déconnecter / Sign out », « Supprimer mon compte / Delete my account ». La cloche : « Notifications ».
- « Accueil / Home » : Uber, 99, copier ou montrer au chauffeur : votre adresse, d’une touche. Raccourcis : Wi-Fi copié d’une touche, services, colocs. SOS : urgences et santé. SOS ouvre « Urgences / Emergency » : « Se soigner à BH / Health care in BH », « Hôpitaux privés / Private hospitals ».
- « Explorer / Explore » : Sorties, restos, voyages en groupe. Dans Pratique : santé, portugais, téléphone volé. Catégories : « Pour vous / For you », « Pratique / Practical », « Sortir / Going out », « Manger / Eat », « Sport », « Culture », « Voyages / Trips ».
  - « Pour vous / For you » : « Premiers pas au Brésil / First steps in Brazil » (Apps, CPF et compte, dans l’ordre).
  - « Pratique / Practical » : « Parler portugais / Speak Portuguese », « On m’a volé mon téléphone / My phone was stolen », « Se soigner à BH / Health care in BH », « Démarches administratives / Paperwork », « Applis et services / Apps and services », « À proximité / Nearby », « Urgences / Emergency ».
  - « Voyages / Trips » : « Partir en groupe / Travel as a group » (Proposez une destination ou rejoignez d’autres résidents.) et les destinations.
- « Maison / House » : L’appartement et la vie avec vos colocataires.
  - « Au quotidien / Everyday » : Adresse, Wi-Fi, poubelles et règles.
  - « À l’immeuble / At the building » : « Visites / Visitors », « Colis / Packages ».
  - « Entre colocataires / With your roommates » : « Qui fait quoi / Who does what », « Dépenses / Expenses », « Colocataires / Roommates ».
  - « Entre résidents / Between residents » : « Communauté / Community » (Le mur, les voyages en groupe et les événements).
  - « Ménage / Cleaning » : Le passage de la professionnelle et votre avis.
- « Séjour / My stay » : Vos demandes, vos paiements et votre contrat.
  - « Demander / Ask » : Services payants et problèmes à réparer, suivis ici.
  - « Payer / Pay » : Loyer, extras et dépôt de garantie.
  - « Mon contrat / My contract » : Le contrat, l’arrivée et le départ.
  - « Aide / Help » : Charlotte, l’équipe sur WhatsApp et le tour de l’app ; aussi « Faire le tour de l’app / Take the app tour », « Politique de confidentialité / Privacy policy ».
  - « Votre séjour / Your stay » : « Mes récaps / My recaps », « Donner mon avis / Give feedback », « Parrainer un ami / Refer a friend », « Une carte pour ma famille / A card for my family ».
- Sans internet : Adresse, Wi-Fi, urgences, règles et phrases restent disponibles.

## Règles de l’appartement (cartilha)
{"title":"Règles","tileStatus":"Silence de 22h à 7h","screenTitle":"Règles de l’appartement","quietTitle":"Heures de silence","quietNote":"Obligatoires. Les nuisances sonores peuvent entraîner une amende.","forbiddenTitle":"Ce qui est interdit","forbidden":[{"title":"Fêtes et réunions bruyantes","detail":"Musique, cris, etc. : uniquement avec un accord écrit préalable."},{"title":"Appeler d’autres appartements","detail":"Pas d’usage abusif de l’interphone, surtout entre 22h et 7h."},{"title":"Bruit dans les parties communes","detail":"Couloirs, hall et ascenseurs, entre 22h et 7h."},{"title":"Mal trier ses déchets","detail":"Suivez les règles de tri de l’immeuble et de la ville."},{"title":"Tenue incorrecte dans les parties communes","detail":"Vêtements mouillés ou sous-vêtements : c’est choquant au Brésil."},{"title":"Fumer dans l’appartement","detail":"Seulement dans les espaces extérieurs prévus, s’il y en a."}],"toiletTitle":"Ne jetez jamais de papier dans les toilettes","toiletText":"Ni papier toilette, ni cotons-tiges, ni mouchoirs, ni aucun autre objet. Au Brésil, les canalisations se bouchent facilement, ce qui peut causer de graves dégâts, et les réparations pourront vous être facturées. Utilisez la poubelle de la salle de bain.","remindersTitle":"Rappels","reminders":["Fermez toujours la porte à clé en quittant l’appartement.","Respectez vos voisins et le personnel de l’immeuble (porteiros).","Signalez immédiatement tout problème de maintenance à votre contact Chez Toi BH."],"question":"Une question ?","questionHint":"Demandez à l’assistant"}

## Urgences
{"title":"Urgences","subtitle":"Qui appeler, et où aller.","call":"Appeler","services":{"samu":"SAMU (ambulance)","police":"Police","fire":"Pompiers"},"hints":{"samu":"Urgence médicale : à appeler en premier","police":"Vol, agression, danger","fire":"Incendie, accident, sauvetage"},"health":"Santé","hospitals":"Hôpitaux privés","hospitalsHint":"Mater Dei, Madre Teresa, Felício Rocho et d’autres","apartment":"L’appartement","writeUs":"Un problème dans l’appartement"}

## Démarches administratives (CPF, RNM…)
[{"title":"CPF","kind":"Numéro fiscal brésilien","summary":"Le CPF est votre numéro d’identification fiscale au Brésil. Beaucoup de services le demandent : applis de livraison, achats en ligne, banques numériques.","notice":"L’inscription est gratuite à la Receita Federal. Les points partenaires (Correios, Banco do Brasil, Caixa, cartórios) la proposent aussi, mais font payer une petite taxe.","steps":[{"title":"Choisissez où faire la demande","body":"Selon le site officiel, quatre options : un guichet de la Receita Federal, un point partenaire, une demande par e-mail (avec une photo de vous tenant votre pièce d’identité près du visage), ou le formulaire en ligne « Inscrever Estrangeiro no CPF » sur gov.br. En ligne, si le formulaire génère un protocole, il faut ensuite présenter ce protocole et vos documents à la Receita Federal."},{"title":"Préparez votre passeport","body":"C’est la pièce d’identité demandée. Le guichet peut aussi vous demander d’autres documents."},{"title":"Faites la demande","body":"Au guichet, comptez jusqu’à 15 minutes d’attente, puis environ 5 minutes pour l’inscription. Par e-mail, la réponse prend en moyenne 48 heures."},{"title":"Gardez la preuve","body":"Notez votre numéro de CPF. Le comprovante d’inscription s’obtient sur gov.br, avec le service « Obter comprovante de inscrição no CPF »."}],"documentsTitle":"Documents","documents":["Passeport (pièce d’identité officielle avec photo)","Acte de naissance ou de mariage (ou équivalent étranger), seulement si votre pièce d’identité n’indique pas la date et le lieu de naissance et la filiation"],"office":{"name":"Receita Federal à Belo Horizonte","address":"Av. Olegário Maciel, 2360 - Santo Agostinho, Belo Horizonte - MG, 30180-112","note":"Vérifiez sur le site de la Receita Federal, avant d’y aller, si un rendez-vous est nécessaire et quels sont les horaires."},"links":[{"label":"Inscription au CPF (gov.br)"},{"label":"Obtenir le comprovante du CPF (gov.br)"}],"tip":"Faites le CPF en premier : il est demandé par la plupart des applis et, avec le RNM, pour ouvrir un compte dans une banque numérique."},{"title":"RNM","kind":"Registre migratoire · Polícia Federal","summary":"Si vous êtes entré au Brésil avec un visa temporaire, comme un visa d’étudiant, vous devez vous enregistrer auprès de la Polícia Federal. Vous recevez la carte du registre migratoire (CRNM, souvent appelée RNM).","notice":"Vous avez 90 jours après votre entrée au Brésil pour vous enregistrer. Après ce délai, des sanctions sont possibles. Avec une autorisation de résidence publiée au Diário Oficial, le délai est de 30 jours. Prenez rendez-vous dès votre arrivée.","steps":[{"title":"Remplissez le formulaire en ligne","body":"Sur le site de la Polícia Federal : le formulaire prend environ 20 minutes. Il faut aussi payer la taxe d’émission de la carte, par boleto (GRU) ; le montant est indiqué sur le site de la PF."},{"title":"Prenez rendez-vous","body":"Le rendez-vous est gratuit et se prend en ligne, dans l’Agenda Web de la Polícia Federal. Il a lieu à l’unité de la PF de votre ville."},{"title":"Allez au rendez-vous","body":"À Belo Horizonte, c’est l’unité de registre des étrangers, au Ponteio Lar Shopping. Apportez les documents de la liste ci-dessous. Comptez environ 30 minutes."},{"title":"Récupérez votre carte","body":"La carte met environ 30 jours ouvrés à être fabriquée, et jusqu’à 180 jours au total selon l’estimation officielle. Le site de la PF indique quand elle est prête. Selon l’unité, un second rendez-vous peut être demandé pour la retirer."}],"documentsTitle":"Documents (titulaire d’un visa temporaire)","documents":["Formulaire de demande rempli en ligne sur le site de la PF","Passeport valide (ou autre document prouvant votre identité et votre nationalité)","Formulaire original du visa","Preuve de paiement de la taxe d’émission de la carte (GRU), quand elle s’applique","Une photo 3x4 récente, en couleur, de face sur fond blanc : seulement si la prise biométrique de la PF est indisponible"],"documentsNote":"La PF peut demander d’autres documents selon le cas, par exemple un acte de naissance ou de mariage récent. Les documents étrangers doivent respecter les règles de légalisation et de traduction. Sans visa temporaire, la démarche est différente (autorisation de résidence pour études) et demande plus de documents : voir les liens officiels.","office":{"name":"Polícia Federal · registre des étrangers","address":"Ponteio Lar Shopping, Rodovia BR-356, 2.500, 1º piso, loja 120D - Santa Lúcia, Belo Horizonte - MG, 30320-901","phone":"+55 31 2517-9900"},"links":[{"label":"Immigration : site de la PF (rendez-vous)"},{"label":"Agenda Web de la PF"},{"label":"Se faire enregistrer comme étranger (gov.br)"},{"label":"Documents : titulaire d’un visa temporaire (PF)"},{"label":"Sans visa : autorisation de résidence pour études (PF)"}],"tip":"Les banques numériques demandent en général le CPF et le RNM : commencez les deux démarches dès votre arrivée. En cas de doute sur votre situation (visa, délai), demandez à votre école ou à la Polícia Federal."}]

## Applis et services utiles (Uber, 99, banques, compagnies aériennes, bus)
[{"name":"Uber","group":"ride","kind":"VTC par appli","description":"L’appli de VTC la plus connue : UberX pour le quotidien, Comfort pour plus d’espace et Uber Moto. Votre compte Uber habituel fonctionne au Brésil.","tip":"Vérifiez la plaque et le nom du chauffeur avant de monter. On peut aussi payer en espèces ou par Pix.","website":"https://www.uber.com/br/pt-br/"},{"name":"99","group":"ride","kind":"VTC et taxis par appli","description":"L’appli de VTC née au Brésil : voitures (99Pop), taxis et motos, dans les grandes villes du pays.","tip":"Comparez avec Uber avant de commander : selon l’heure, l’une ou l’autre est moins chère.","website":"https://99app.com/"},{"name":"iFood","group":"food","kind":"Livraison de repas et de courses","description":"La grande appli de livraison du Brésil : restaurants, mais aussi supermarchés et pharmacies.","tip":"L’inscription demande un CPF, et les cartes étrangères sont souvent refusées : payez par Pix, avec une carte brésilienne, ou à la livraison (« pagar na entrega ») quand le restaurant le propose.","website":"https://www.ifood.com.br/"},{"name":"Nubank","group":"bank","kind":"Banque numérique","description":"La plus grande banque numérique du Brésil, à la carte violette : compte gratuit, Pix et carte de crédit sans frais annuels.","tip":"Le compte s’ouvre dans l’appli, mais il faut d’abord un CPF et, en général, votre RNM (registre migratoire) : le passeport seul ne suffit pas. Vérifiez les documents demandés dans l’appli avant de commencer.","website":"https://nubank.com.br/"},{"name":"C6 Bank","group":"bank","kind":"Banque numérique","description":"Banque numérique avec compte gratuit et Pix, et une « Conta Global » en dollars ou en euros, pratique pour l’argent venu de l’étranger.","tip":"Le compte s’ouvre dans l’appli, mais il faut d’abord un CPF et, en général, votre RNM (registre migratoire) : le passeport seul ne suffit pas. Vérifiez les documents demandés dans l’appli avant de commencer.","website":"https://www.c6bank.com.br/"},{"name":"Inter","group":"bank","kind":"Banque numérique","description":"Banque numérique née à Belo Horizonte : compte gratuit, Pix et une appli qui réunit aussi achats en ligne et cashback.","tip":"Le compte s’ouvre dans l’appli, mais il faut d’abord un CPF et, en général, votre RNM (registre migratoire) : le passeport seul ne suffit pas. Vérifiez les documents demandés dans l’appli avant de commencer.","website":"https://inter.co/"},{"name":"Azul","group":"air","kind":"Compagnie aérienne","description":"Confins est le deuxième plus grand hub d’Azul, avec une soixantaine de destinations au Brésil et à l’étranger.","tip":"Les vols partent de Confins (CNF), à ≈ 40 km : comptez ≈ 1 h en Uber, ou prenez le bus Conexão Aeroporto.","website":"https://www.voeazul.com.br/"},{"name":"Gol","group":"air","kind":"Compagnie aérienne","description":"Compagnie brésilienne à petits prix, avec des vols de Confins vers les grandes villes comme São Paulo, Rio et Salvador.","tip":"Comparez les trois compagnies sur Google Flights : les prix varient beaucoup selon le jour.","website":"https://www.voegol.com.br/"},{"name":"LATAM","group":"air","kind":"Compagnie aérienne","description":"Le plus grand groupe aérien d’Amérique latine : pratique pour les voyages en Amérique du Sud et les correspondances internationales via São Paulo.","tip":"Pour l’Amérique du Sud, vérifiez les documents demandés dans l’onglet Explorer, rubrique Voyages, sur la page de chaque destination.","website":"https://www.latamairlines.com/br/pt"},{"name":"Buser","group":"bus","kind":"Voyages en bus","description":"Appli de voyages en bus affrétés, souvent moins chers que les compagnies classiques, avec des départs de BH vers d’autres villes.","tip":"Le départ n’est pas toujours à la gare routière : vérifiez l’adresse dans l’appli avant de partir.","website":"https://www.buser.com.br/"},{"name":"Localiza","group":"car","kind":"Location de voitures","description":"Le leader de la location de voitures au Brésil, né à Belo Horizonte en 1973, avec des agences en ville et à l’aéroport de Confins. Âge minimum 18 ans, avec un supplément « jeune conducteur » avant 21 ans.","tip":"Il faut votre passeport, une carte de crédit à votre nom et le permis de votre pays, valable 180 jours après l’arrivée au Brésil. Prenez aussi le permis international : il est exigé pour les pays de la Convention de Vienne, comme la France.","website":"https://www.localiza.com/brasil/pt-br"},{"name":"Movida","group":"car","kind":"Location de voitures","description":"L’une des grandes loueuses de voitures du Brésil, avec des agences dans tout le pays. Vérifiez l’âge minimum au moment de réserver.","tip":"Il faut votre passeport, une carte de crédit à votre nom et le permis de votre pays, valable 180 jours après l’arrivée au Brésil. Prenez aussi le permis international : il est exigé pour les pays de la Convention de Vienne, comme la France.","website":"https://www.movida.com.br/"},{"name":"WhatsApp","group":"daily","kind":"Messagerie","description":"Au Brésil, presque tout passe par WhatsApp : la Chez Toi, les colocataires, les restaurants, les cabinets médicaux et beaucoup d’entreprises répondent par là.","tip":"Votre compte habituel fonctionne au Brésil, même avec votre numéro français : pas besoin d’un numéro brésilien pour l’utiliser.","website":"https://www.whatsapp.com/"},{"name":"Mercado Livre","group":"daily","kind":"Achats en ligne","description":"Le grand site d’achats en ligne du Brésil : électronique, maison, vêtements et presque tout le reste, livrés à l’appartement.","tip":"Il faut un CPF pour créer le compte et recevoir les livraisons. Mettez l’adresse complète avec le numéro de l’appartement.","website":"https://www.mercadolivre.com.br/"},{"name":"gov.br","group":"daily","kind":"Services publics","description":"Le compte unique du gouvernement brésilien : il ouvre les services en ligne qui affichent le bouton « Entrar com gov.br ».","tip":"Il faut un CPF pour créer le compte : faites-le une fois le CPF obtenu (voir Démarches).","website":"https://www.gov.br/"},{"name":"Moovit","group":"ride","kind":"Transports en commun","description":"Les itinéraires en bus et en métro à BH, avec les horaires, les arrêts et le trajet à pied jusqu’à l’arrêt.","tip":"Pratique en journée pour les trajets du quotidien ; le soir, Uber ou 99 restent plus simples et plus sûrs.","website":"https://moovit.com/"},{"name":"Rappi","group":"food","kind":"Livraison de repas et de courses","description":"Repas, courses, boissons et produits de pharmacie livrés en quelques minutes, dans plus de 300 villes d’Amérique latine.","tip":"Comparez avec iFood avant de commander : les promotions changent d’une appli à l’autre.","website":"https://www.rappi.com.br/"},{"name":"Zé Delivery","group":"food","kind":"Livraison de boissons","description":"Bière, vin et boissons fraîches livrées chez vous, avec glace, charbon et snacks ; en mode turbo, en 15 minutes au plus.","tip":"La vente d’alcool est interdite aux moins de 18 ans au Brésil.","website":"https://www.ze.delivery/"},{"name":"Duo Gourmet","group":"food","kind":"Club de restaurants","description":"Un abonnement qui donne deux plats pour le prix d’un dans des milliers de restaurants, et des réductions sur d’autres sorties.","tip":"C’est un abonnement payant : faites le calcul si vous sortez souvent au restaurant.","website":"https://www.duogourmet.com.br/"},{"name":"Wise","group":"money","kind":"Compte international","description":"Pour changer des euros en reais au taux de change commercial, sans frais cachés, et envoyer de l’argent dans plus de 70 pays.","tip":"Avant un gros transfert, comme le loyer, comparez le montant reçu avec celui de votre banque.","website":"https://wise.com/br/"},{"name":"Revolut","group":"money","kind":"Compte international","description":"Un compte en euros, en dollars et dans plus de 30 devises, avec une carte pour payer au Brésil comme chez vous.","tip":"Au terminal de paiement ou au distributeur, choisissez toujours de payer en reais (BRL) : la conversion proposée par la machine coûte plus cher.","website":"https://www.revolut.com/"},{"name":"Drogaria Araujo","group":"health","kind":"Pharmacie","description":"La grande chaîne de pharmacies de BH, avec des magasins ouverts 24 h et la livraison par l’appli.","tip":"Les antibiotiques ne sont vendus qu’avec une ordonnance, que la pharmacie garde.","website":"https://www.araujo.com.br/"},{"name":"Meu Mater Dei","group":"health","kind":"Hôpital","description":"L’appli du réseau d’hôpitaux Mater Dei : prendre rendez-vous pour une consultation ou un examen, voir les résultats et les ordonnances numériques.","tip":"Avant d’y aller, vérifiez avec votre assurance si elle couvre les hôpitaux privés et comment être remboursé ; gardez toutes les factures.","website":"https://www.materdei.com.br/"},{"name":"Wellhub","group":"health","kind":"Sport et bien-être","description":"Un seul abonnement pour des salles de sport, des studios et des activités (yoga, natation, crossfit), quand une entreprise l’offre à ses employés.","tip":"C’est un avantage d’employeur : en stage au Brésil, demandez à l’entreprise si elle le propose. Sinon, voyez Explorer › Sport.","website":"https://wellhub.com/"},{"name":"Sympla","group":"events","kind":"Billets et événements","description":"La plus grande plateforme d’événements du Brésil : soirées, concerts, festivals, cours et idées pour le week-end, avec le billet dans l’appli.","tip":"Achetez tôt : beaucoup de soirées passent au tarif suivant (le « lote ») quand le premier est vendu.","website":"https://www.sympla.com.br/"},{"name":"Eventim","group":"events","kind":"Billets de concerts","description":"Billets pour les grands concerts et spectacles, avec le choix de la place sur le plan de la salle.","tip":"Achetez seulement dans l’appli ou sur le site officiel : les billets revendus ailleurs peuvent être faux.","website":"https://www.eventim.com.br/"}]

## Restaurants recommandés
- Glouton · Franco-mineira · Lourdes · R. Bárbara Heliodora, 71 - Lourdes
- Parallel · Espagnole · Lourdes · R. Santa Catarina, 1155 - Lourdes
- Pacato · Mineira contemporaine · Lourdes · R. Rio de Janeiro, 2735 - Lourdes
- Trintaeum · Mineira d’auteur · Lourdes · R. Prof. Antônio Aleixo, 20 - Lourdes
- Per Lui Restaurante · Menu dégustation · Serra · R. Muzambinho, 608 - Serra
- Birosca Restaurante & Deli · Mineira affective · Lourdes · R. São Paulo, 2003 - Lourdes
- Anella Ristorante · Italienne · Santa Amelia · Av. Min. Guilhermino de Oliveira, 325 - Santa Amelia
- Ōkinaki · Japonaise et coréenne · Lourdes · Av. Álvares Cabral, 1303 - Lourdes
- Nino Cucina - Belo Horizonte · Italienne · Lourdes · R. Curitiba, 2090 - Lourdes
- Marú Bar Japonês · Japonaise-brésilienne · Savassi · R. Fernandes Tourinho, 604 - Savassi
- OssO · Parrilla · Lourdes · R. São Paulo, 1984 - Lourdes
- Villeon Restaurante · Contemporaine · Luxemburgo · R. Elias Antônio Jorge, 21 - Luxemburgo
- Pátria - Cozinha do Brasil · Brésilienne · Belvedere · Av. Celso Porfírio Machado, 1520 - Belvedere
- Rex Bibendi · Bar à vins · Funcionários · R. Antônio de Albuquerque, 917 - Funcionários
- Est! Est!! Est!!! Ristorante Italiano · Italienne · Funcionários · Av. Getúlio Vargas, 107 - Funcionários
- Barolio Savassi · Pizzeria napolitaine · Savassi · R. Tomé de Souza, 616 - Lj - Savassi
- Restaurante Amado Lourdes · Brésilienne contemporaine · Lourdes · R. Alvarenga Peixoto, 900 - Lourdes
- Casa Calixto: Restaurante, Drinks, Carnes, Peixes, Frutos do Mar, Savassi, BH · Contemporaine · Savassi · R. Padre Odorico, 81 - Savassi
- el MAI · Contemporaine (mexicaine, italienne, japonaise) · Lourdes · R. Prof. Antônio Aleixo, 592 - Lourdes
- Restaurante Ninita · Italienne · Lourdes · R. Bárbara Heliodora, 71 - Lourdes
- Domenico Pizzeria e Trattoria · Pizzeria & trattoria · Savassi · R. Cláudio Manoel, 583 - Savassi
- Cozinha Tupis · Mineira · Centro · Av. Olegário Maciel, 742 - Lj 2161 - Centro
- Bar da Lora Savassi · Boteco mineiro · Savassi · R. Sergipe, 1414 - Savassi
- Gastrô Hub - Restaurante e Espaço de Eventos · Italienne & brésilienne · Serra · Av. do Contorno, 4667 - Serra
- Odoyá Cozinha · Brésilienne · Savassi · R. Pernambuco, 797 - Savassi
- Dona Fulô | BH · Nordestine · Lourdes · R. Santa Catarina, 778 - Lourdes
- Hou Mei · Asiatique (coréenne, chinoise) · Lourdes · R. Marília de Dirceu, 159 - Lourdes
- Stadt Jever · Allemande · Funcionários · Av. do Contorno, 5771 - Funcionários
- Esquina Santê · Variée · Santa Tereza · Rua Silvianópolis, 464 - Santa Tereza
- Restaurante Italiano Maurizio Gallo · Italienne · Lourdes · R. dos Aimorés, 2305 - Lourdes
- Indian Gourmet · Indienne · Lourdes · R. Alvarenga Peixoto, 585 - Lourdes
- O Candiá · Mineira · Prado · Av. Francisco Sá, 430 - Prado
- Baxo Bar · Bar · Funcionários · R. Fernandes Tourinho, 241 - Funcionários
- SAL15 Burger and Shop · Burgers artisanaux · Prado · R. Pedra Bonita, 346 - Prado
- Nimbos Bar · Burgers et bar · Savassi · R. Sergipe, 629 - Savassi
- Ferris Burger · Burgers artisanaux · Savassi · Rua dos Inconfidentes, 615 - Savassi
- Juicy Burger Shop BH · Burgers · Lourdes · Rua dos Guajajaras, 847 - Lourdes
- American Bulls - Silveira · Burgers américains · de Lima · R. Ilacir Pereira Lima, 124 - de Lima
- Foraster Burguer · Burgers gourmets · Cidade Nova · Rua Dr. Júlio Otaviano Ferreira, 615 - Cidade Nova
- Meatz Burger - Centro Sul - Hamburgueria · Burgers · Santo Antônio · Av. Prudente de Morais, 399/401 - Santo Antônio
- James Burger - Hambúrguer Artesanal na Savassi | Delivery de Hambúrguer | Hamburgueria Perto de Você | Hamburgueria em BH · Burgers artisanaux · Savassi · R. Sergipe, 1091 - Savassi
- Eddie Fine Burgers - Lourdes (Casa Amarela) · Burgers classiques · Lourdes · R. da Bahia, 2652 - Casa Amarela! - Lourdes

## Vie nocturne
- Redentor Bar · bar · Savassi · R. Fernandes Tourinho, 500 - Savassi
- Berilo Cozinha & Drinks · bar · Savassi · R. Fernandes Tourinho, 503 - Savassi
- Moema Bar e Cozinha · bar · Funcionários · R. Sergipe, 1370 - Funcionários
- Estação Savassi · bar · Funcionários · R. Paraíba, 1352 - Lj 8 - Funcionários
- Mercado Novo · bar · Centro · R. Rio Grande do Sul, 499 - Centro
- LAB · club · Savassi · Av. do Contorno, 6342 - Savassi
- Major Lock Pub · club · Centro · Rua dos Guajajaras, 842 - Centro
- Night Market · club · Estoril · R. Wilson Rocha Lima, 137 - Estoril
- Raro Club · club · Vila da Serra (Nova Lima) · R. Sen. Milton Campos, 230 - Vila da Serra, Nova Lima - MG
- Chalezinho · club · Estoril · Av. Professor Mário Werneck, 530 - Estoril

## Sport
- Lagoa da Pampulha · Grand tour du lac · São Luiz · Av. Otacílio Negrão de Lima, s/n - São Luiz
- Praça da Liberdade · Footing en ville · Savassi · Praça da Liberdade - Savassi
- Lagoa Seca · Circuit de quartier · Belvedere · Rua Juvenal de Melo Senra, 675 - Belvedere
- Parque Municipal · Parc ombragé · Centro · Av. Afonso Pena, 1377 - Centro
- Parque das Mangabeiras · Parc avec dénivelé · Mangabeiras · Av. José do Patrocínio Pontes, 580 - Mangabeiras
- Smart Fit · Chaîne de salles · prix bas · Funcionários · R. Fernandes Tourinho, 195 - Funcionários
- Bluefit · Chaîne de salles · 24 h/24 · Funcionários · R. Sergipe, 1448 - Funcionários
- Contorno do Corpo · Chaîne mineira · Funcionários · R. dos Aimorés, 20 - Funcionários
- Pratique Fitness · Chaîne de BH · Funcionários · Av. Carandaí, 41 - Funcionários
- BH Wake School · Wakeboard derrière un bateau · Lagoa dos Ingleses (Nova Lima) · Clube Serra da Moeda, BR-040 – Lagoa dos Ingleses, Nova Lima - MG
- Pé na Areia · Courts de sable · Serra · R. Luz, 126 - Serra
- Orla Sports · Beach tennis, padel et volley · Belvedere · Av. Celso Porfírio Machado, 870 - Belvedere
- 4Set Arena · Padel, beach tennis et volley · Buritis · R. Líbero Leone, 259 - Buritis
- Arena Serra · Foot society à louer · Serra · R. Laguna, 9 - Serra
- La Bombonera Centro Esportivo · Foot et école de foot · Buritis · Av. Professor Mário Werneck, 569 - Buritis
- Arena 7 BH · Football, beach tennis et futevôlei · Alípio de Melo · Av. Heráclito Mourão de Miranda, 907 - Alípio de Melo
- LayBack Park · Beach tennis, skate et bar · Vale do Sereno (Nova Lima) · Rod. Januário Carneiro, 20 - Vale do Sereno, Nova Lima - MG
- Fast Tennis · Cours de tennis · plusieurs unités · Savassi · Av. do Contorno, 6539 - Savassi
- Aera Pilates · Pilates sur Reformer · Belvedere · Rua Modesto Carvalho de Araújo, 674 - Belvedere
- Goyá Health Club · Yoga, pilates et fonctionnel · Santa Lúcia · R. Parentins, 420 - Santa Lúcia
- Flow Yoga · Yoga et hot yoga · Vila da Serra (Nova Lima) · Alameda Oscar Niemeyer 1369 - lojas 55 e 56 - Vila da Serra, Nova Lima - MG
- Vidya Studio · Yoga et hot yoga · Belvedere · Rua Modesto Carvalho de Araújo, 674 - Belvedere
- Studio Velocity · Bike indoor en musique · Vila da Serra (Nova Lima) · Alameda Oscar Niemeyer, 891 - Vila da Serra, Nova Lima - MG
- Companhia do Nado · Natation et salle · Cruzeiro · Rua Vitório Marçola, 435 - Cruzeiro
- Gracie Barra Savassi · Jiu-jitsu brésilien · Savassi · R. Levindo Lopes, 373 - Savassi

## Beauté (coiffeurs, barbiers, manucure)
- bLOw · Bar à brushing · hair
- The Blonde Concept · Salon · blonds et mèches · hair
- Fast Escova · Brushing et coiffage · hair
- Thiago Dias Studio · Barbier · hommes · barber
- Esmalteria Lu Duarte · Onglerie · nails
- UP Esmalteria · Onglerie · nails
- Charmeá Estética · Onglerie et esthétique · nails
- Espaço Flávia Costa · Sourcils et regard · brows
- Fabi Archanjo Beauty · Sourcils, cils et cheveux · brows
- Depyl Action · Épilation · waxing
- Alecrim Relaxamento e Bem-Estar · Massages et bien-être · spa
- Spa Lótus · Spa urbain · spa

## Attractions à BH
- Igreja São Francisco de Assis · pampulha · São Luiz · Avenida Otacílio Negrão de Lima, 3000 - Pampulha - São Luiz
- Lagoa da Pampulha · pampulha · São Luiz · Av. Otacílio Negrão de Lima, s/n - São Luiz
- Casa do Baile · pampulha · Pampulha · Av. Otacílio Negrão de Lima, 751 - Pampulha
- Mineirão · pampulha · São José · Av. Antônio Abrahão Caram, 1001 - São José
- Mercado Central · markets · Centro · Av. Augusto de Lima, 744 - Centro
- Mercado Novo · markets · Centro · R. Rio Grande do Sul, 499 - Centro
- Praça da Liberdade · culture · Savassi · Praça da Liberdade - Savassi
- CCBB Belo Horizonte · culture · Funcionários · Praça da Liberdade, 450 - Funcionários
- MM Gerdau – Museu das Minas e do Metal · culture · Funcionários · Praça da Liberdade, 680 - Funcionários
- Palácio das Artes · culture · Centro · Av. Afonso Pena, 1537 - Centro
- Parque Municipal · outdoors · Centro · Av. Afonso Pena, 1377 - Centro
- Mirante do Mangabeiras · outdoors · Mangabeiras · R. Pedro José Pardo, 1000 - Mangabeiras
- Parque da Serra do Curral · outdoors · Mangabeiras · Av. José do Patrocínio Pontes, 1951 - Mangabeiras
- Feira Hippie · markets · Centro · Av. Afonso Pena, 1005-901 - Centro
- Santa Tereza · markets · Santa Tereza · Praça Duque de Caxias, 200 - Santa Tereza
- Praça da Estação & Museu de Artes e Ofícios · culture · Centro · Praça Rui Barbosa, 600 - Centro
- Praça do Papa · outdoors · Mangabeiras · Av. Agulhas Negras, s/n - Mangabeiras

## Santé : page « Se soigner à BH / Health care in BH » (« Explorer / Explore » › « Pratique / Practical », ou SOS). Jamais d’avis médical.
Où aller et quoi dire à l’accueil. Ce sont des informations générales : elles ne remplacent pas une consultation médicale.
- Urgence vitale : Douleur dans la poitrine, mal à respirer, malaise, saignement fort, accident : appelez, c’est gratuit. 192 (SAMU).
- Où aller : Urgent, mais sans danger immédiat : une UPA (urgences publiques) ou les urgences d’un hôpital privé.
  - UPA Centro-Sul · Urgences publiques · Rua Domingos Vieira, 488, Santa Efigênia
  - Mater Dei Contorno · Hôpital privé · urgences 24 h/24 · Av. do Contorno, 9000, Barro Preto
  - Hospital Lifecenter · Hôpital privé · urgences 24 h/24 · Av. do Contorno, 4747, Funcionários
- À l’hôpital privé, on paie en général sur place, puis on demande le remboursement à son assurance. Demandez et gardez la nota fiscal (la facture) et le relatório médico (le compte rendu du médecin) : l’assurance en aura besoin.
- À l’accueil, phrases en portugais : Preciso de um médico. (J’ai besoin d’un médecin.) · Eu não falo bem português. (Je ne parle pas bien portugais.) · Vou pagar e pedir reembolso ao meu seguro. (Je vais payer et demander le remboursement à mon assurance.) · Pode me dar a nota fiscal e o relatório médico? (Vous pouvez me donner la facture et le compte rendu médical ?)
- Pharmacies : La Drogaria Araujo est partout à BH, et presque toutes sont ouvertes 24 h/24. Trouver une Drogaria Araujo : Autour de vous, dans Google Maps. L’appli Drogaria Araujo : Commander et se faire livrer.
- Médecin, dentiste, gynécologue : En français ou en anglais, au cabinet ou en téléconsultation. Chercher sur Doctoralia : Choisissez la spécialité et Belo Horizonte, puis le filtre « Idioma » : Francês ou Inglês. Avis des patients et rendez-vous en ligne.
- Besoin de parler ? En cas de crise ou de danger immédiat, appelez le 192 (SAMU), en haut de cette page. Un psychologue en français ou en anglais : Sur Doctoralia, au cabinet ou en vidéo : choisissez « Teleconsulta » et cherchez la langue dans les filtres ou les profils.

## Communauté des résidents (« Maison / House » › « Communauté / Community »)
Les résidents Chez Toi : entraide, sorties et voyages. La communauté est réservée aux résidents actuels.
- Le mur : Questions, bons plans et petites annonces. Qui le voit ? Tous les résidents ou Mes colocataires. Type de message : Message, Question, Je donne / je vends.
- Voyages en groupe : Partez avec d’autres résidents. « Proposer un voyage / Propose a trip » : Destination, Départ, Durée, Places (vous compris), Le programme (facultatif). Pour participer : « Je viens / I’m in ». Discussion du groupe : Pour vous organiser entre participants, ici même. Rejoignez le voyage pour discuter avec le groupe. Transport ou logement ? Demander à la Chez Toi. Annuler ce voyage ? Les participants seront prévenus.
- Événements Chez Toi : Organisés par l’équipe, pour tous les résidents. Réponse : « J’y vais / I’m going », « Je ne peux pas / I can’t ».
- Charte de la communauté (à accepter avant de publier) : Bienveillance : On parle à tout le monde avec respect : pas d’insultes, de moqueries ni de propos discriminatoires. Vie privée : Pas de numéro, d’adresse ou de photo de quelqu’un sans son accord. Ni arnaque ni pub : Les petites annonces entre résidents, oui ; la publicité et les liens douteux, non. Rien d’illégal : Pas de drogues, d’armes ni de contenu sexuel. Les conflits en privé : Un souci avec un colocataire ? Parlez-lui, ou écrivez à la Chez Toi, pas sur le mur. Sécurité : Si quelqu’un semble en danger, signalez-le et appelez les urgences.
- Modération : Chaque message passe par l’assistante avant d’être publié. Ce qui pose question va à l’équipe Chez Toi, qui décide. Un contenu signalé par 3 personnes est masqué en attendant l’équipe. Ne pas respecter la charte peut suspendre votre accès à la communauté.
- Signaler : L’équipe Chez Toi reçoit le signalement. La personne signalée ne sait pas que c’est vous. Motifs : Publicité ou spam, Harcèlement ou insultes, Contenu inapproprié, Quelqu’un est en danger, Données personnelles de quelqu’un, Autre chose. En cas d’urgence, appelez le 190 (police) ou le 192 (SAMU), puis la Chez Toi.
- Bloquer quelqu’un : Vous ne verrez plus ce que cette personne publie, et elle ne verra plus ce que vous publiez. Vous pouvez débloquer quand vous voulez.
- Liens : Les liens ne sont pas autorisés dans l’app : écrivez plutôt le nom du lieu ou de l’appli.

## Téléphone volé : guide « On m’a volé mon téléphone / My phone was stolen » (« Explorer / Explore » › « Pratique / Practical »)
Pas de panique : tout se fait depuis le téléphone d’un colocataire ou un ordinateur. J’aide un colocataire : Suivez les étapes avec votre colocataire, sur votre téléphone, dans l’ordre. Quelqu’un est blessé ou en danger ? Appelez d’abord la police ou le SAMU. Police · 190, SAMU · 192.
Les étapes, dans cet ordre (le détail, les liens officiels et les numéros sont dans le guide) :
1. Verrouiller le téléphone à distance : Depuis ce téléphone ou un ordinateur, en quelques minutes. (iPhone, Android)
2. Alerte Celular Seguro, si elle a été préparée : Une seule alerte prévient l’opérateur et les banques partenaires.
3. Bloquer la puce : Pour que personne n’utilise son numéro. (Puce brésilienne, Puce française) Vivo · 1058, Claro · 1052, TIM · 1056, Orange · +33 9 69 39 39 00.
4. Bloquer les banques et le Pix : Cartes, applis bancaires et Pix. (Banque brésilienne, Carte française)
5. Porter plainte (boletim de ocorrência) : Nécessaire même avec Celular Seguro, et pour bloquer l’appareil. (Sans violence ni menace (furto), Avec violence ou menace (roubo)) Police · 190.
6. Bloquer l’appareil (IMEI) : Le téléphone ne marche plus sur les réseaux mobiles brésiliens.
7. Récupérer WhatsApp : Avec une nouvelle puce au même numéro.
8. Changer les mots de passe : Depuis un ordinateur ou ce téléphone.
9. Prévenir Chez Toi : Écrivez-nous sur WhatsApp depuis votre téléphone : nous vous répondrons sur ce numéro.
Tout marche aussi depuis un ordinateur : icloud.com/find, google.com/android/find, l’espace client de l’opérateur et le site de la banque.
Avant que ça arrive (réglages à faire tant qu’on a son téléphone) : Activer Localiser ; Connaître son mot de passe Apple ou Google ; Noter l’IMEI et son numéro ; Préparer Celular Seguro ; Garder le numéro d’opposition de sa banque ; Protéger WhatsApp.

## Accès à l’app et compte
- Premier accès (écran de connexion, « Premier accès ? Activer mon compte / First time? Activate my account »), 3 étapes. 1, Qui êtes-vous ? E-mail, Date de naissance, Numéro de passeport : Les informations de votre fiche Chez Toi, remplie avant votre arrivée. 2, Vos informations : Ce que la Chez Toi a sur votre fiche. Vérifiez avant d’entrer. « Corriger une information / Correct something » : L’équipe corrige votre fiche ; vous pouvez entrer tout de suite. 3, Votre mot de passe : Au moins 8 caractères, dont un chiffre.
  - Si ça bloque : Ces informations ne correspondent à aucune fiche active. Vérifiez-les ou écrivez-nous sur WhatsApp. Trop d’essais. Réessayez dans une heure ou écrivez-nous sur WhatsApp. Votre fiche n’a pas encore de numéro de passeport. L’équipe Chez Toi vous envoie votre accès sur WhatsApp, en général dans la journée. Vous avez déjà un accès à l’app. Connectez-vous avec votre mot de passe ou, si vous l’avez oublié, choisissez-en un nouveau avec « Mot de passe oublié ».
- Mot de passe oublié (écran de connexion, « Mot de passe oublié ? / Forgot your password? ») : Indiquez l’e-mail de votre contrat. Si un compte existe pour cet e-mail, un code à 6 chiffres vient de partir par e-mail. Il est valable 15 minutes. Sans e-mail automatique : Demande envoyée. L’équipe Chez Toi vous envoie un mot de passe provisoire sur WhatsApp, en général dans la journée.
- Fin du séjour : Votre séjour est terminé. L’app reste ouverte jusqu’au 30e jour après la date de sortie : téléchargez votre contrat et vos documents avant. Votre séjour est terminé depuis plus de 30 jours : l’accès à l’app est fermé. Besoin d’un document ? Écrivez-nous sur WhatsApp.
- Supprimer mon compte (« Profil / Profile » › « Supprimer mon compte / Delete my account ») : Votre compte de l’app est supprimé tout de suite et vous êtes déconnecté sur ce téléphone. C’est définitif. Pour revenir, il faudra demander un nouvel accès à la Chez Toi. Votre mot de passe, pour confirmer. Ce qui est supprimé : Votre profil et ce que vous avez publié dans la communauté (messages, commentaires, voyages) ; Vos avis, vos réponses aux questionnaires et votre code de parrainage ; Vos visites, vos colis et vos avis sur le ménage ; Ce que l’app gardait sur ce téléphone : journal, récap, progrès en portugais. Ce que la Chez Toi garde : Votre contrat, vos paiements et vos demandes facturées (obligations légales) ; Les dépenses partagées avec vos colocataires, pour que leurs comptes restent justes ; Votre acceptation des règles de la maison.

## Confidentialité et Charlotte (IA)
- Pour vous répondre, vos questions et les photos que vous joignez sont traitées par Claude, l’intelligence artificielle d’Anthropic. Elles passent par le serveur de la Chez Toi avec ce qu’il faut de votre contrat et de vos données. La conversation n’est pas enregistrée. Charlotte est facultative : tout le reste de l’app marche sans elle. Je peux me tromper : pour une décision importante, vérifiez avec l’équipe Chez Toi.
- « Signaler cette réponse / Report this answer » (sous chaque réponse) : Information fausse, Réponse déplacée, Conseil dangereux, Autre chose. Merci, l’équipe va relire cette réponse.
- « Politique de confidentialité / Privacy policy » (Ce que l’app fait de vos données) : « Séjour / My stay » › « Aide / Help ».

## Avis, questionnaire et parrainage (« Séjour / My stay » › « Votre séjour / Your stay »)
- « Donner mon avis / Give feedback » : Ce qui va bien, ce qui ne va pas, une idée : l’équipe lit tout et vous répond dans l’app. C’est à propos de : Général, L’appartement, Le ménage, L’équipe, L’app, Une idée. Une réparation ou une urgence ? Passez par Demander ou écrivez-nous sur WhatsApp : c’est plus rapide.
- Questionnaire (au milieu et à la fin du séjour, annoncé sur « Accueil / Home ») : Deux minutes, et l’équipe lit chaque réponse. Recommanderiez-vous la Chez Toi à un ami ? En détail : L’appartement, Le ménage, L’équipe Chez Toi, L’app. La Chez Toi peut publier ce commentaire comme témoignage, sur son site et ses réseaux. Aucun questionnaire à remplir pour le moment. Une remarque ou une idée ? Écrivez à l’équipe quand vous voulez.
- « Parrainer un ami / Refer a friend » : Un ami cherche un logement à BH ? Donnez-lui votre code. Partagez votre code avec un ami. Votre ami donne ce code à l’équipe quand il la contacte. Vous suivez où il en est ici. Ce que vous gagnez et conditions : affichés sur la page, fixés par l’équipe. Mes parrainages : En contact, Visite prévue, A signé, Récompense prête, N’a pas signé.

## Visites, colis et profil (« Maison / House » › « À l’immeuble / At the building »)
- « Visites / Visitors » : Vos invités, annoncés à la portaria avant leur arrivée. Au Brésil, beaucoup d’immeubles ont un porteiro à l’entrée : il ne laisse monter un visiteur que si l’habitant l’a annoncé. Prévenez-le avant chaque visite ; l’app écrit le message en portugais pour vous. Le numéro de la portaria n’est pas encore dans l’app : le message part à l’équipe Chez Toi, qui prévient la portaria. Le nom, le jour ou l’heure ont changé : prévenez la portaria à nouveau.
- « Colis / Packages » : Ajoutez les colis que vous attendez. Quand l’un d’eux arrive à la portaria, l’équipe Chez Toi le signale et vous recevez une notification. Une fois en main, marquez-le comme récupéré.
- « Mon profil pour les colocs / My profile for roommates » (« Profil / Profile ») : Quelques mots pour que vos colocataires vous connaissent. École ou université, Ville et pays d’origine, Langues parlées, Instagram (facultatif), En une phrase. Vos colocataires actuels voient ce profil sur la page Colocataires. L’équipe Chez Toi peut aussi le consulter.`;
