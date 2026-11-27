-- 005 (produção) / 030 (appctbh): lembretes e avisos automáticos (27/11/2026). Substitui a versão anterior (028).
-- Pedidos do Daniel: aluguel (vence todo dia 1) 5, 3 e 1 dia antes; faxina na véspera; e os pushes escolhidos:
-- véspera da chegada, feriado amanhã, véspera de evento da Chez Toi (quem confirmou), despesa nova que inclui o aluno,
-- recap do mês pronto (dia 1), uma semana antes da saída, pesquisa de satisfação quando abre, e a frase em português da
-- semana (segunda-feira).
-- Tudo vira aviso em app_notices: cai no sino e, para quem tem o app instalado com notificações, vira push pelo gatilho
-- da 022 (app-push). Cada aviso sai uma vez só (app_reminders_sent). Só para contas ativas, com senha e com locação na
-- janela do app. Horários de BH: 10h (manhã), 18h (véspera), segunda 10h (português). Idempotente: pode rodar de novo.
-- Feriados e frases vêm do próprio app (src/lib/holidays.ts e src/lib/portuguese.ts), gerados em 27/11/2026.

begin;

-- ---------- tabelas ----------
create table if not exists public.app_reminders_sent (
  kind text not null,
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  ref text not null,
  sent_at timestamptz not null default now(),
  primary key (kind, counterparty_id, ref)
);
alter table public.app_reminders_sent drop constraint if exists app_reminders_sent_kind_check;
alter table public.app_reminders_sent add constraint app_reminders_sent_kind_check check (kind in
  ('rent', 'cleaning', 'arrival', 'holiday', 'event', 'expense', 'recap', 'checkout', 'survey', 'portuguese'));
alter table public.app_reminders_sent enable row level security;
revoke all on public.app_reminders_sent from public, anon, authenticated;

create table if not exists public.app_holidays (
  day date primary key,
  kind text not null,
  name jsonb not null
);
alter table public.app_holidays enable row level security;
revoke all on public.app_holidays from public, anon, authenticated;

create table if not exists public.app_pt_phrases (
  id text primary key,
  ord integer not null,
  pt text not null,
  fr text not null,
  en text not null,
  say text
);
alter table public.app_pt_phrases enable row level security;
revoke all on public.app_pt_phrases from public, anon, authenticated;

-- ---------- dados do app ----------
-- 45 feriados, 111 frases
insert into public.app_holidays (day, kind, name) values
  (date '2026-01-01', 'national', jsonb_build_object('fr', 'Jour de l’An', 'en', 'New Year’s Day', 'pt', 'Confraternização Universal')),
  (date '2026-02-16', 'optional', jsonb_build_object('fr', 'Carnaval (lundi)', 'en', 'Carnival Monday', 'pt', 'Carnaval')),
  (date '2026-02-17', 'optional', jsonb_build_object('fr', 'Carnaval (mardi)', 'en', 'Carnival Tuesday', 'pt', 'Carnaval')),
  (date '2026-04-03', 'city', jsonb_build_object('fr', 'Vendredi saint', 'en', 'Good Friday', 'pt', 'Sexta-feira da Paixão')),
  (date '2026-04-21', 'national', jsonb_build_object('fr', 'Tiradentes', 'en', 'Tiradentes Day', 'pt', 'Tiradentes')),
  (date '2026-05-01', 'national', jsonb_build_object('fr', 'Fête du Travail', 'en', 'Labour Day', 'pt', 'Dia do Trabalho')),
  (date '2026-06-04', 'city', jsonb_build_object('fr', 'Fête‑Dieu (Corpus Christi)', 'en', 'Corpus Christi', 'pt', 'Corpus Christi')),
  (date '2026-08-15', 'city', jsonb_build_object('fr', 'Assomption', 'en', 'Assumption Day', 'pt', 'Assunção de Nossa Senhora')),
  (date '2026-09-07', 'national', jsonb_build_object('fr', 'Fête de l’Indépendance', 'en', 'Independence Day', 'pt', 'Independência do Brasil')),
  (date '2026-10-12', 'national', jsonb_build_object('fr', 'Notre‑Dame d’Aparecida', 'en', 'Our Lady of Aparecida', 'pt', 'Nossa Senhora Aparecida')),
  (date '2026-11-02', 'national', jsonb_build_object('fr', 'Jour des Morts', 'en', 'All Souls’ Day', 'pt', 'Finados')),
  (date '2026-11-15', 'national', jsonb_build_object('fr', 'Proclamation de la République', 'en', 'Republic Day', 'pt', 'Proclamação da República')),
  (date '2026-11-20', 'national', jsonb_build_object('fr', 'Journée de la conscience noire', 'en', 'Black Consciousness Day', 'pt', 'Dia da Consciência Negra')),
  (date '2026-12-08', 'city', jsonb_build_object('fr', 'Immaculée Conception', 'en', 'Immaculate Conception', 'pt', 'Imaculada Conceição')),
  (date '2026-12-25', 'national', jsonb_build_object('fr', 'Noël', 'en', 'Christmas Day', 'pt', 'Natal')),
  (date '2027-01-01', 'national', jsonb_build_object('fr', 'Jour de l’An', 'en', 'New Year’s Day', 'pt', 'Confraternização Universal')),
  (date '2027-02-08', 'optional', jsonb_build_object('fr', 'Carnaval (lundi)', 'en', 'Carnival Monday', 'pt', 'Carnaval')),
  (date '2027-02-09', 'optional', jsonb_build_object('fr', 'Carnaval (mardi)', 'en', 'Carnival Tuesday', 'pt', 'Carnaval')),
  (date '2027-03-26', 'city', jsonb_build_object('fr', 'Vendredi saint', 'en', 'Good Friday', 'pt', 'Sexta-feira da Paixão')),
  (date '2027-04-21', 'national', jsonb_build_object('fr', 'Tiradentes', 'en', 'Tiradentes Day', 'pt', 'Tiradentes')),
  (date '2027-05-01', 'national', jsonb_build_object('fr', 'Fête du Travail', 'en', 'Labour Day', 'pt', 'Dia do Trabalho')),
  (date '2027-05-27', 'city', jsonb_build_object('fr', 'Fête‑Dieu (Corpus Christi)', 'en', 'Corpus Christi', 'pt', 'Corpus Christi')),
  (date '2027-08-15', 'city', jsonb_build_object('fr', 'Assomption', 'en', 'Assumption Day', 'pt', 'Assunção de Nossa Senhora')),
  (date '2027-09-07', 'national', jsonb_build_object('fr', 'Fête de l’Indépendance', 'en', 'Independence Day', 'pt', 'Independência do Brasil')),
  (date '2027-10-12', 'national', jsonb_build_object('fr', 'Notre‑Dame d’Aparecida', 'en', 'Our Lady of Aparecida', 'pt', 'Nossa Senhora Aparecida')),
  (date '2027-11-02', 'national', jsonb_build_object('fr', 'Jour des Morts', 'en', 'All Souls’ Day', 'pt', 'Finados')),
  (date '2027-11-15', 'national', jsonb_build_object('fr', 'Proclamation de la République', 'en', 'Republic Day', 'pt', 'Proclamação da República')),
  (date '2027-11-20', 'national', jsonb_build_object('fr', 'Journée de la conscience noire', 'en', 'Black Consciousness Day', 'pt', 'Dia da Consciência Negra')),
  (date '2027-12-08', 'city', jsonb_build_object('fr', 'Immaculée Conception', 'en', 'Immaculate Conception', 'pt', 'Imaculada Conceição')),
  (date '2027-12-25', 'national', jsonb_build_object('fr', 'Noël', 'en', 'Christmas Day', 'pt', 'Natal')),
  (date '2028-01-01', 'national', jsonb_build_object('fr', 'Jour de l’An', 'en', 'New Year’s Day', 'pt', 'Confraternização Universal')),
  (date '2028-02-28', 'optional', jsonb_build_object('fr', 'Carnaval (lundi)', 'en', 'Carnival Monday', 'pt', 'Carnaval')),
  (date '2028-02-29', 'optional', jsonb_build_object('fr', 'Carnaval (mardi)', 'en', 'Carnival Tuesday', 'pt', 'Carnaval')),
  (date '2028-04-14', 'city', jsonb_build_object('fr', 'Vendredi saint', 'en', 'Good Friday', 'pt', 'Sexta-feira da Paixão')),
  (date '2028-04-21', 'national', jsonb_build_object('fr', 'Tiradentes', 'en', 'Tiradentes Day', 'pt', 'Tiradentes')),
  (date '2028-05-01', 'national', jsonb_build_object('fr', 'Fête du Travail', 'en', 'Labour Day', 'pt', 'Dia do Trabalho')),
  (date '2028-06-15', 'city', jsonb_build_object('fr', 'Fête‑Dieu (Corpus Christi)', 'en', 'Corpus Christi', 'pt', 'Corpus Christi')),
  (date '2028-08-15', 'city', jsonb_build_object('fr', 'Assomption', 'en', 'Assumption Day', 'pt', 'Assunção de Nossa Senhora')),
  (date '2028-09-07', 'national', jsonb_build_object('fr', 'Fête de l’Indépendance', 'en', 'Independence Day', 'pt', 'Independência do Brasil')),
  (date '2028-10-12', 'national', jsonb_build_object('fr', 'Notre‑Dame d’Aparecida', 'en', 'Our Lady of Aparecida', 'pt', 'Nossa Senhora Aparecida')),
  (date '2028-11-02', 'national', jsonb_build_object('fr', 'Jour des Morts', 'en', 'All Souls’ Day', 'pt', 'Finados')),
  (date '2028-11-15', 'national', jsonb_build_object('fr', 'Proclamation de la République', 'en', 'Republic Day', 'pt', 'Proclamação da República')),
  (date '2028-11-20', 'national', jsonb_build_object('fr', 'Journée de la conscience noire', 'en', 'Black Consciousness Day', 'pt', 'Dia da Consciência Negra')),
  (date '2028-12-08', 'city', jsonb_build_object('fr', 'Immaculée Conception', 'en', 'Immaculate Conception', 'pt', 'Imaculada Conceição')),
  (date '2028-12-25', 'national', jsonb_build_object('fr', 'Noël', 'en', 'Christmas Day', 'pt', 'Natal'))
on conflict (day) do update set kind = excluded.kind, name = excluded.name;

insert into public.app_pt_phrases (id, ord, pt, fr, en, say) values
  ('basics-hi', 0, 'Oi, tudo bem?', 'Salut, ça va ?', 'Hi, how are you?', 'oï, TOU-dou bein ?'),
  ('basics-beleza', 1, 'Beleza?', 'Ça roule ?', 'All good?', 'bé-LÊ-za ?'),
  ('basics-thanks', 2, 'Obrigado!', 'Merci !', 'Thank you!', 'o-bri-GA-dou !'),
  ('basics-valeu', 3, 'Valeu!', 'Merci ! (entre amis)', 'Thanks! (casual)', 'va-LÊOU !'),
  ('basics-welcome', 4, 'De nada!', 'De rien !', 'You’re welcome!', 'dji NA-da !'),
  ('basics-excuse', 5, 'Com licença.', 'Pardon (pour passer).', 'Excuse me (to get past).', 'kon li-SSEN-ssa'),
  ('basics-uai', 6, 'Uai!', 'Ben ! / Ah bon ?', 'Well! / Huh?', 'ouaï !'),
  ('basics-trem', 7, 'Esse trem é bão demais!', 'Ce truc est trop bon !', 'This thing is so good!', 'Ê-ssi trein è baon dji-MAÏS !'),
  ('basics-so', 8, 'Cê tá bão, sô?', 'Ça va bien, mon vieux ?', 'You doing good, man?', 'ssê ta baon, ssô ?'),
  ('basics-nossa', 9, 'Nossa, que calor!', 'Waouh, qu’il fait chaud !', 'Wow, it’s so hot!', 'NO-ssa, ki ka-LÔ !'),
  ('basics-conta', 10, 'Não dou conta!', 'Je n’y arrive pas ! / Je n’en peux plus !', 'I can’t handle it!', 'naon dô KON-ta !'),
  ('basics-cade', 11, 'Cadê você?', 'T’es où ?', 'Where are you?', 'ka-DÊ vo-SÊ ?'),
  ('ride-driver', 12, 'Oi! Você é o Marcos, do Uber?', 'Bonjour ! Vous êtes Marcos, le chauffeur Uber ?', 'Hi! Are you Marcos, the Uber driver?', 'oï ! vo-SÊ è ou MAR-kous, dou OU-bèr ?'),
  ('ride-waiting', 13, 'Eu tô esperando na portaria.', 'J’attends à l’entrée de l’immeuble.', 'I’m waiting at the building entrance.', 'éou tô is-pé-RAN-dou na por-ta-RI-a'),
  ('ride-coming', 14, 'Já tô descendo!', 'Je descends tout de suite !', 'I’m coming down now!', 'ja tô dé-SSEN-dou !'),
  ('ride-trunk', 15, 'Pode abrir o porta-malas, por favor?', 'Vous pouvez ouvrir le coffre, s’il vous plaît ?', 'Could you open the trunk, please?', 'PO-dji a-BRI ou por-ta-MA-las, pour fa-VÔ ?'),
  ('ride-ac', 16, 'Pode ligar o ar, por favor?', 'Vous pouvez mettre la clim, s’il vous plaît ?', 'Could you turn on the AC, please?', 'PO-dji li-GA ou ah, pour fa-VÔ ?'),
  ('ride-app', 17, 'Pode seguir pelo aplicativo, por favor.', 'Vous pouvez suivre l’itinéraire de l’appli, s’il vous plaît.', 'You can follow the route in the app, please.', 'PO-dji ssé-GUI PÊ-lou a-pli-ka-TCHI-vou, pour fa-VÔ'),
  ('ride-slow', 18, 'Pode ir mais devagar, por favor?', 'Vous pouvez rouler moins vite, s’il vous plaît ?', 'Could you slow down, please?', 'PO-dji i maïs dji-va-GA, pour fa-VÔ ?'),
  ('ride-corner', 19, 'Pode parar ali na esquina?', 'Vous pouvez vous arrêter là, au coin ?', 'Can you stop there, at the corner?', 'PO-dji pa-RA a-LI na is-KI-na ?'),
  ('ride-here', 20, 'Pode me deixar aqui mesmo.', 'Vous pouvez me déposer ici.', 'You can drop me off right here.', 'PO-dji mi dêi-CHA a-KI MÊZ-mou'),
  ('ride-price', 21, 'Quanto fica até o centro?', 'C’est combien jusqu’au centre ?', 'How much is it to downtown?', 'KOUAN-tou FI-ka a-TÉ ou SSEN-trou ?'),
  ('ride-card', 22, 'Aceita cartão?', 'Vous acceptez la carte ?', 'Do you take cards?', 'a-SSÊI-ta kar-TAON ?'),
  ('restaurant-table', 23, 'Uma mesa pra dois, por favor.', 'Une table pour deux, s’il vous plaît.', 'A table for two, please.', 'OU-ma MÊ-za pra dôïs, pour fa-VÔ'),
  ('restaurant-menu', 24, 'Me traz o cardápio, por favor?', 'Vous m’apportez la carte, s’il vous plaît ?', 'Could you bring me the menu, please?', 'mi traïs ou kar-DA-piou, pour fa-VÔ ?'),
  ('restaurant-recommend', 25, 'O que você recomenda?', 'Qu’est-ce que vous recommandez ?', 'What do you recommend?', 'ou ki vo-SÊ hé-ko-MEN-da ?'),
  ('restaurant-beer', 26, 'Me vê uma cerveja, por favor.', 'Une bière, s’il vous plaît.', 'A beer, please.', 'mi vê OU-ma ssèr-VÊ-ja, pour fa-VÔ'),
  ('restaurant-another', 27, 'Desce mais uma!', 'Une autre !', 'Another one!', 'DÊ-ssi maïs OU-ma !'),
  ('restaurant-veggie', 28, 'Tem opção vegetariana?', 'Vous avez une option végétarienne ?', 'Do you have a vegetarian option?', 'tein op-SSAON vé-jé-ta-ri-A-na ?'),
  ('restaurant-ice', 29, 'Sem gelo, por favor.', 'Sans glaçons, s’il vous plaît.', 'No ice, please.', 'sein JÊ-lou, pour fa-VÔ'),
  ('restaurant-delicious', 30, 'Tá uma delícia!', 'C’est délicieux !', 'It’s delicious!', 'ta OU-ma dé-LI-ssia !'),
  ('restaurant-bill', 31, 'A conta, por favor.', 'L’addition, s’il vous plaît.', 'The check, please.', 'a KON-ta, pour fa-VÔ'),
  ('restaurant-split', 32, 'Pode dividir em três no cartão?', 'Vous pouvez diviser en trois, par carte ?', 'Can you split it three ways, by card?', 'PO-dji dji-vi-DJI ein três nou kar-TAON ?'),
  ('restaurant-service', 33, 'Os dez por cento já estão incluídos?', 'Le service de 10 % est déjà compris ?', 'Is the 10% service charge already included?', 'ous dèis pour SSEN-tou ja is-TAON in-klou-I-dous ?'),
  ('bakery-bread', 34, 'Me vê cinco pães de sal, por favor.', 'Cinq petits pains, s’il vous plaît.', 'Five bread rolls, please.', 'mi vê SSIN-kou païns dji saou, pour fa-VÔ'),
  ('bakery-paodequeijo', 35, 'Um pão de queijo e um café com leite.', 'Un pão de queijo et un café au lait.', 'A cheese bread and a coffee with milk.', 'oun paon dji KÊI-jou i oun ka-FÉ kon LÊI-tchi'),
  ('bakery-warm', 36, 'Tá quentinho?', 'Il est encore chaud ?', 'Is it still warm?', 'ta kein-TCHI-gnou ?'),
  ('bakery-ham', 37, 'Duzentos gramas de presunto, por favor.', 'Deux cents grammes de jambon, s’il vous plaît.', 'Two hundred grams of ham, please.', 'dou-ZEN-tous GRA-mas dji pré-ZOUN-tou, pour fa-VÔ'),
  ('bakery-kilo', 38, 'Quanto custa o quilo?', 'C’est combien le kilo ?', 'How much is it per kilo?', 'KOUAN-tou KOUS-ta ou KI-lou ?'),
  ('bakery-milk', 39, 'Onde fica o leite?', 'Où est le lait ?', 'Where’s the milk?', 'ON-dji FI-ka ou LÊI-tchi ?'),
  ('bakery-bag', 40, 'Tem sacola?', 'Vous avez un sac ?', 'Do you have a bag?', 'tein ssa-KO-la ?'),
  ('bakery-cpf', 41, 'CPF na nota?', 'Votre CPF sur le ticket ?', 'Your CPF on the receipt?', 'ssê pê È-fi na NO-ta ?'),
  ('bakery-debit', 42, 'Débito ou crédito?', 'Débit ou crédit ?', 'Debit or credit?', 'DÈ-bi-tou ou KRÈ-dji-tou ?'),
  ('bakery-done', 43, 'É só isso, obrigado.', 'Ce sera tout, merci.', 'That’s all, thanks.', 'è sso I-ssou, o-bri-GA-dou'),
  ('pharmacy-sick', 44, 'Tô passando mal.', 'Je ne me sens pas bien.', 'I’m feeling sick.', 'tô pa-SSAN-dou maou'),
  ('pharmacy-headache', 45, 'Tô com dor de cabeça.', 'J’ai mal à la tête.', 'I have a headache.', 'tô kon dô dji ka-BÊ-ssa'),
  ('pharmacy-fever', 46, 'Tô com febre.', 'J’ai de la fièvre.', 'I have a fever.', 'tô kon FÈ-bri'),
  ('pharmacy-throat', 47, 'Tô com dor de garganta.', 'J’ai mal à la gorge.', 'I have a sore throat.', 'tô kon dô dji gar-GAN-ta'),
  ('pharmacy-stomach', 48, 'Tô com dor de barriga.', 'J’ai mal au ventre.', 'I have a stomachache.', 'tô kon dô dji ba-HI-ga'),
  ('pharmacy-flu', 49, 'Você tem alguma coisa pra gripe?', 'Vous avez quelque chose contre la grippe ?', 'Do you have something for the flu?', 'vo-SÊ tein aou-GOU-ma KOÏ-za pra GRI-pi ?'),
  ('pharmacy-prescription', 50, 'Precisa de receita?', 'Il faut une ordonnance ?', 'Do I need a prescription?', 'pré-SSI-za dji hé-SSÊI-ta ?'),
  ('pharmacy-times', 51, 'Quantas vezes por dia?', 'Combien de fois par jour ?', 'How many times a day?', 'KOUAN-tas VÊ-zis pour DJI-a ?'),
  ('pharmacy-allergy', 52, 'Sou alérgico à penicilina.', 'Je suis allergique à la pénicilline.', 'I’m allergic to penicillin.', 'ssô a-LÈR-ji-kou a pé-ni-ssi-LI-na'),
  ('pharmacy-sunscreen', 53, 'Tem protetor solar e repelente?', 'Vous avez de la crème solaire et de l’anti-moustique ?', 'Do you have sunscreen and insect repellent?', 'tein pro-té-TÔ sso-LA i hé-pé-LEN-tchi ?'),
  ('pharmacy-doctor', 54, 'Preciso de um médico.', 'J’ai besoin d’un médecin.', 'I need a doctor.', 'pré-SSI-zou dji oun MÈ-dji-kou'),
  ('emergency-help', 55, 'Socorro!', 'Au secours !', 'Help!', 'sso-KÔ-hou !'),
  ('emergency-need-help', 56, 'Preciso de ajuda.', 'J’ai besoin d’aide.', 'I need help.', 'pré-SSI-zou dji a-JOU-da'),
  ('emergency-ambulance', 57, 'Chama uma ambulância!', 'Appelez une ambulance !', 'Call an ambulance!', 'CHA-ma OU-ma an-bou-LAN-ssia !'),
  ('emergency-police', 58, 'Chama a polícia!', 'Appelez la police !', 'Call the police!', 'CHA-ma a po-LI-ssia !'),
  ('emergency-fire', 59, 'Tá pegando fogo!', 'Il y a le feu !', 'There’s a fire!', 'ta pé-GAN-dou FÔ-gou !'),
  ('emergency-hurt', 60, 'Tem alguém ferido.', 'Il y a un blessé.', 'Someone is hurt.', 'tein aou-GUEIN fé-RI-dou'),
  ('emergency-robbed', 61, 'Fui assaltado.', 'Je me suis fait agresser et voler.', 'I’ve been robbed.', 'fouï a-ssaou-TA-dou'),
  ('emergency-phone', 62, 'Roubaram meu celular.', 'On m’a volé mon portable.', 'My phone was stolen.', 'hô-BA-raon mêou ssé-lou-LA'),
  ('emergency-passport', 63, 'Perdi meu passaporte.', 'J’ai perdu mon passeport.', 'I lost my passport.', 'pèr-DJI mêou pa-ssa-POR-tchi'),
  ('emergency-hospital', 64, 'Onde fica o hospital mais perto?', 'Où est l’hôpital le plus proche ?', 'Where’s the nearest hospital?', 'ON-dji FI-ka ou ôs-pi-TAOU maïs PÈR-tou ?'),
  ('emergency-language', 65, 'Eu não falo bem português.', 'Je ne parle pas bien portugais.', 'I don’t speak Portuguese well.', 'éou naon FA-lou bein por-tou-GUÊS'),
  ('building-hello', 66, 'Bom dia, seu José!', 'Bonjour, monsieur José !', 'Good morning, Mr. José!', 'bon DJI-a, ssêou jo-ZÉ !'),
  ('building-live', 67, 'Eu moro no 802.', 'J’habite au 802.', 'I live in 802.', 'éou MO-rou nou oï-tou-SSEN-tous i dôïs'),
  ('building-package', 68, 'Chegou alguma encomenda pra mim?', 'Un colis est arrivé pour moi ?', 'Has a package arrived for me?', 'ché-GÔ aou-GOU-ma in-ko-MEN-da pra min ?'),
  ('building-friend', 69, 'Pode liberar a entrada do meu amigo?', 'Vous pouvez laisser entrer mon ami ?', 'Can you let my friend in?', 'PO-dji li-bé-RA a in-TRA-da dou mêou a-MI-gou ?'),
  ('building-key', 70, 'Esqueci a chave dentro de casa.', 'J’ai oublié la clé à l’intérieur.', 'I left my key inside.', 'is-ké-SSI a CHA-vi DEN-trou dji KA-za'),
  ('building-power', 71, 'A luz acabou.', 'Il n’y a plus d’électricité.', 'The power went out.', 'a louss a-ka-BÔ'),
  ('building-leak', 72, 'Tá vazando água no banheiro.', 'Il y a une fuite d’eau dans la salle de bain.', 'There’s a water leak in the bathroom.', 'ta va-ZAN-dou A-goua nou ba-GNÊI-rou'),
  ('building-elevator', 73, 'O elevador tá quebrado.', 'L’ascenseur est en panne.', 'The elevator is broken.', 'ou é-lé-va-DÔ ta ké-BRA-dou'),
  ('building-trash', 74, 'A que horas passa o caminhão do lixo?', 'À quelle heure passe le camion-poubelle ?', 'What time does the garbage truck come?', 'a ki O-ras PA-ssa ou ka-mi-GNAON dou LI-chou ?'),
  ('building-noise', 75, 'Desculpa o barulho!', 'Désolé pour le bruit !', 'Sorry about the noise!', 'dis-KOU-pa ou ba-ROU-lyou !'),
  ('building-party', 76, 'Vamos fazer uma festinha no sábado, tudo bem?', 'On fait une petite fête samedi, ça vous va ?', 'We’re having a small party on Saturday, is that okay?', 'VA-mous fa-ZÊ OU-ma fès-TCHI-gna nou SSA-ba-dou, TOU-dou bein ?'),
  ('party-meet', 77, 'Prazer! Eu sou o Lucas.', 'Enchanté ! Je m’appelle Lucas.', 'Nice to meet you! I’m Lucas.', 'pra-ZÊ ! éou ssô ou LOU-kas'),
  ('party-french', 78, 'Sou francês, de Paris.', 'Je suis français, de Paris.', 'I’m French, from Paris.', 'ssô fran-SSÊS, dji pa-RIS'),
  ('party-from', 79, 'De onde você é?', 'Tu viens d’où ?', 'Where are you from?', 'dji ON-dji vo-SÊ è ?'),
  ('party-drink', 80, 'Bora tomar uma?', 'On va boire un verre ?', 'Shall we grab a drink?', 'BO-ra to-MA OU-ma ?'),
  ('party-zap', 81, 'Me passa seu zap?', 'Tu me donnes ton WhatsApp ?', 'Can I have your WhatsApp?', 'mi PA-ssa ssêou zap ?'),
  ('party-cool', 82, 'Que legal!', 'Trop bien !', 'That’s cool!', 'ki lé-GAOU !'),
  ('party-cheers', 83, 'Saúde!', 'Santé !', 'Cheers!', 'ssa-OU-dji !'),
  ('party-forro', 84, 'Você dança forró?', 'Tu danses le forró ?', 'Do you dance forró?', 'vo-SÊ DAN-ssa fo-HO ?'),
  ('party-friends', 85, 'Posso levar uns amigos?', 'Je peux venir avec des amis ?', 'Can I bring some friends?', 'PO-ssou lé-VA ouns a-MI-gous ?'),
  ('party-plan', 86, 'Vamos marcar alguma coisa!', 'Il faut qu’on se voie !', 'Let’s hang out sometime!', 'VA-mous mar-KA aou-GOU-ma KOÏ-za !'),
  ('party-last', 87, 'Saideira!', 'La dernière pour la route !', 'One last round!', 'ssaï-DÊI-ra !'),
  ('party-home', 88, 'Tô cansado, vou pra casa.', 'Je suis fatigué, je rentre.', 'I’m tired, I’m heading home.', 'tô kan-SSA-dou, vô pra KA-za'),
  ('university-exchange', 89, 'Sou aluno de intercâmbio.', 'Je suis étudiant en échange.', 'I’m an exchange student.', 'ssô a-LOU-nou dji in-tèr-KAN-biou'),
  ('university-office', 90, 'Onde fica a secretaria?', 'Où est le secrétariat ?', 'Where’s the administration office?', 'ON-dji FI-ka a ssé-kré-ta-RI-a ?'),
  ('university-room', 91, 'Em que sala é a aula?', 'Le cours est dans quelle salle ?', 'Which room is the class in?', 'ein ki SSA-la è a AOU-la ?'),
  ('university-repeat', 92, 'Não entendi. Pode repetir?', 'Je n’ai pas compris. Vous pouvez répéter ?', 'I didn’t get that. Could you repeat?', 'naon in-ten-DJI. PO-dji hé-pé-TCHI ?'),
  ('university-slowly', 93, 'Pode falar mais devagar, por favor?', 'Vous pouvez parler plus lentement, s’il vous plaît ?', 'Could you speak more slowly, please?', 'PO-dji fa-LA maïs dji-va-GA, pour fa-VÔ ?'),
  ('university-exam', 94, 'Quando é a prova?', 'C’est quand, l’examen ?', 'When is the exam?', 'KOUAN-dou è a PRO-va ?'),
  ('university-english', 95, 'Posso fazer o trabalho em inglês?', 'Je peux faire le projet en anglais ?', 'Can I do the assignment in English?', 'PO-ssou fa-ZÊ ou tra-BA-lyou ein in-GLÊS ?'),
  ('university-together', 96, 'Vamos fazer o trabalho juntos?', 'On fait le projet ensemble ?', 'Shall we do the assignment together?', 'VA-mous fa-ZÊ ou tra-BA-lyou JOUN-tous ?'),
  ('university-wifi', 97, 'Qual é a senha do wi-fi?', 'C’est quoi le mot de passe du wifi ?', 'What’s the wifi password?', 'kouaou è a SSÊ-gna dou ouaï-FAÏ ?'),
  ('university-lunch', 98, 'Onde dá pra almoçar aqui perto?', 'Où est-ce qu’on peut déjeuner près d’ici ?', 'Where can we have lunch near here?', 'ON-dji da pra aou-mo-SSA a-KI PÈR-tou ?'),
  ('university-late', 99, 'Cheguei atrasado, desculpa.', 'Je suis arrivé en retard, désolé.', 'I’m late, sorry.', 'ché-GUÊÏ a-tra-ZA-dou, dis-KOU-pa'),
  ('bank-pix', 100, 'Pode ser no Pix?', 'Je peux payer par Pix ?', 'Can I pay by Pix?', 'PO-dji ssê nou piks ?'),
  ('bank-key', 101, 'Qual é a chave Pix?', 'C’est quoi la clé Pix ?', 'What’s the Pix key?', 'kouaou è a CHA-vi piks ?'),
  ('bank-receipt', 102, 'Te mando o comprovante no zap.', 'Je t’envoie le reçu sur WhatsApp.', 'I’ll send you the receipt on WhatsApp.', 'tchi MAN-dou ou kon-pro-VAN-tchi nou zap'),
  ('bank-total', 103, 'Quanto deu?', 'Ça fait combien ?', 'How much is it?', 'KOUAN-tou dêou ?'),
  ('bank-credit', 104, 'Pode passar no crédito?', 'Vous pouvez le passer en crédit ?', 'Can you put it through as credit?', 'PO-dji pa-SSA nou KRÈ-dji-tou ?'),
  ('bank-installments', 105, 'À vista ou parcelado?', 'En une fois ou en plusieurs fois ?', 'In one payment or in installments?', 'a VIS-ta ou par-ssé-LA-dou ?'),
  ('bank-declined', 106, 'Meu cartão não passou.', 'Ma carte n’est pas passée.', 'My card didn’t go through.', 'mêou kar-TAON naon pa-SSÔ'),
  ('bank-change', 107, 'Tem troco pra cinquenta?', 'Vous avez la monnaie sur cinquante ?', 'Do you have change for fifty?', 'tein TRÔ-kou pra ssin-KOUEN-ta ?'),
  ('bank-atm', 108, 'Onde tem um caixa eletrônico?', 'Où est-ce qu’il y a un distributeur ?', 'Where is there an ATM?', 'ON-dji tein oun KAÏ-cha é-lé-TRÔ-ni-kou ?'),
  ('bank-withdraw', 109, 'Queria sacar dinheiro.', 'Je voudrais retirer de l’argent.', 'I’d like to withdraw cash.', 'ké-RI-a ssa-KA dji-GNÊI-rou'),
  ('bank-account', 110, 'Queria abrir uma conta.', 'Je voudrais ouvrir un compte.', 'I’d like to open an account.', 'ké-RI-a a-BRI OU-ma KON-ta')
on conflict (id) do update set ord = excluded.ord, pt = excluded.pt, fr = excluded.fr, en = excluded.en, say = excluded.say;


-- ---------- ajudas ----------
-- "R$ 1.234,56" / "€ 12,50"
create or replace function public.app_money(p_cents integer, p_currency text)
returns text language sql immutable set search_path to '' as $$
  select case when p_currency = 'EUR' then '€ ' else 'R$ ' end
    || regexp_replace((abs(p_cents) / 100)::text, '(\d)(?=(\d{3})+$)', '\1.', 'g')
    || ',' || lpad((abs(p_cents) % 100)::text, 2, '0')
$$;
revoke all on function public.app_money(integer, text) from public, anon, authenticated;

-- Quem recebe lembretes: conta ativa, com senha, com locação na janela do app.
create or replace function public.app_reminder_students()
returns setof uuid language sql stable security definer set search_path to '' as $$
  select s.counterparty_id
  from public.app_students s
  where s.status = 'active' and s.deleted_at is null and s.password_hash is not null
    and public.app_rental_for(s.counterparty_id) is not null
$$;
revoke all on function public.app_reminder_students() from public, anon, authenticated;

-- Grava o aviso só se ainda não saiu (kind, aluno, ref). Devolve true quando gravou.
create or replace function public.app_remind(p_kind text, p_cp uuid, p_ref text, p_title jsonb, p_body jsonb, p_href text)
returns boolean language plpgsql security definer set search_path to '' as $$
begin
  insert into public.app_reminders_sent (kind, counterparty_id, ref) values (p_kind, p_cp, p_ref) on conflict do nothing;
  if not found then
    return false;
  end if;
  insert into public.app_notices (audience, counterparty_id, title, body, href)
  values ('student', p_cp, p_title, p_body, p_href);
  return true;
end;
$$;
revoke all on function public.app_remind(text, uuid, text, jsonb, jsonb, text) from public, anon, authenticated;

drop function if exists public.app_send_reminders(text);
drop function if exists public.app_send_reminders(text, date);

-- p_today: só para testar outro dia; o agendamento usa hoje em BH.
create or replace function public.app_send_reminders(p_kind text, p_today date default null)
returns integer language plpgsql security definer set search_path to '' as $$
declare
  v_today date := coalesce(p_today, (now() at time zone 'America/Sao_Paulo')::date);
  v_count integer := 0;
  v_m int;
  v_fr text;
  v_en text;
  v_month_fr text[] := array['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  v_month_en text[] := array['January','February','March','April','May','June','July','August','September','October','November','December'];
  r record;
begin
  -- Aluguel: vence todo dia 1; 5, 3 e 1 dia antes, se o mês ainda não está pago.
  if p_kind = 'rent' then
    for r in
      select cp, n.days, (v_today + n.days) as due
      from public.app_reminder_students() as cp
      cross join (values (5), (3), (1)) as n(days)
      where extract(day from v_today + n.days) = 1
        and exists (
          select 1 from public.student_payments p
          join public.rental_tenants t on t.id = p.tenant_id
          where t.counterparty_id = cp and t.is_active
            and t.rental_id = any (public.app_rentals_for(cp))
            and p.month_year = (v_today + n.days)
            and coalesce(p.status, '') <> 'paid'
            and coalesce(lower(p.payment_type), 'rent') = 'rent')
    loop
      v_m := extract(month from r.due)::int;
      v_fr := case when v_m in (4, 8, 10) then 'd’' else 'de ' end || v_month_fr[v_m];
      if public.app_remind('rent', r.cp, to_char(r.due, 'YYYY-MM') || ':' || r.days,
        jsonb_build_object(
          'fr', 'Loyer ' || v_fr || ' : ' || case when r.days = 1 then 'demain' else 'dans ' || r.days || ' jours' end,
          'en', v_month_en[v_m] || ' rent: due ' || case when r.days = 1 then 'tomorrow' else 'in ' || r.days || ' days' end),
        jsonb_build_object(
          'fr', 'À payer le 1er ' || v_month_fr[v_m] || '. Pix et virement dans Séjour › Paiements.',
          'en', 'Due on ' || v_month_en[v_m] || ' 1. Pix and bank details in My stay › Payments.'),
        '/apartment/payments') then v_count := v_count + 1; end if;
    end loop;

  -- Faxina: na véspera, com o horário.
  elsif p_kind = 'cleaning' then
    for r in
      select distinct cp, k.id as cleaning_id,
        coalesce(k.scheduled_time, case when ar.cleaning_time ~ '^\d{1,2}:\d{2}$' then ar.cleaning_time::time end) as at_time
      from public.app_reminder_students() as cp
      join public.rental_tenants t on t.counterparty_id = cp and t.is_active
      join public.cleaning_records k on k.rental_id = t.rental_id
      join public.apartment_rentals ar on ar.id = k.rental_id
      where k.scheduled_date = v_today + 1 and not coalesce(k.completed, false)
        and t.rental_id = any (public.app_rentals_for(cp))
    loop
      if public.app_remind('cleaning', r.cp, r.cleaning_id::text,
        jsonb_build_object(
          'fr', 'Ménage demain' || coalesce(' à ' || extract(hour from r.at_time)::int || 'h' || to_char(r.at_time, 'MI'), ''),
          'en', 'Cleaning tomorrow' || coalesce(' at ' || ((extract(hour from r.at_time)::int + 11) % 12 + 1) || ':'
                || to_char(r.at_time, 'MI') || case when extract(hour from r.at_time) < 12 then ' AM' else ' PM' end, '')),
        jsonb_build_object(
          'fr', 'Pensez à laisser l’accès libre aux pièces à nettoyer.',
          'en', 'Remember to leave the rooms to clean accessible.'),
        '/apartment/cleaning') then v_count := v_count + 1; end if;
    end loop;

  -- Véspera da chegada.
  elsif p_kind = 'arrival' then
    for r in
      select distinct cp, t.rental_id
      from public.app_reminder_students() as cp
      join public.rental_tenants t on t.counterparty_id = cp and t.is_active
      where t.rental_id = any (public.app_rentals_for(cp))
        and coalesce(t.arrival_confirmed_date, t.move_in_date) = v_today + 1
    loop
      if public.app_remind('arrival', r.cp, r.rental_id::text,
        jsonb_build_object('fr', 'Demain, bienvenue chez vous !', 'en', 'Tomorrow: welcome home!'),
        jsonb_build_object(
          'fr', 'L’adresse, le Wi‑Fi et les premiers pas vous attendent dans l’app.',
          'en', 'Your address, Wi‑Fi and first steps are waiting in the app.'),
        '/?welcome=1') then v_count := v_count + 1; end if;
    end loop;

  -- Feriado amanhã.
  elsif p_kind = 'holiday' then
    for r in
      select cp, h.day, h.name
      from public.app_reminder_students() as cp
      join public.app_holidays h on h.day = v_today + 1
    loop
      if public.app_remind('holiday', r.cp, r.day::text,
        jsonb_build_object('fr', 'Demain, c’est férié : ' || (r.name->>'fr'), 'en', 'Tomorrow is a public holiday: ' || (r.name->>'en')),
        jsonb_build_object(
          'fr', 'Commerces et pharmacies peuvent fermer plus tôt ou rester fermés : pensez aux courses aujourd’hui.',
          'en', 'Shops and pharmacies may close early or stay closed: do your shopping today.'),
        '/calendar') then v_count := v_count + 1; end if;
    end loop;

  -- Véspera de evento da Chez Toi, para quem confirmou presença.
  elsif p_kind = 'event' then
    for r in
      select cp, e.id, e.title, e.venue, e.starts_at
      from public.app_reminder_students() as cp
      join public.app_community_event_rsvps v on v.counterparty_id = cp and v.going
      join public.app_community_events e on e.id = v.event_id
      where e.status = 'published' and (e.starts_at at time zone 'America/Sao_Paulo')::date = v_today + 1
    loop
      if public.app_remind('event', r.cp, r.id::text,
        jsonb_build_object('fr', 'Demain : ' || coalesce(r.title->>'fr', r.title->>'en'), 'en', 'Tomorrow: ' || coalesce(r.title->>'en', r.title->>'fr')),
        jsonb_build_object(
          'fr', (public.app_notice_when(r.starts_at)->>'fr') || ' · ' || r.venue || '. À demain !',
          'en', (public.app_notice_when(r.starts_at)->>'en') || ' · ' || r.venue || '. See you there!'),
        '/community/events/' || r.id) then v_count := v_count + 1; end if;
    end loop;

  -- Recap do mês: dia 1, para quem já estava em BH no mês que acabou.
  elsif p_kind = 'recap' then
    if extract(day from v_today) = 1 then
      v_m := extract(month from v_today - 1)::int;
      for r in
        select cp
        from public.app_reminder_students() as cp
        where exists (
          select 1 from public.rental_tenants t
          join public.apartment_rentals ar on ar.id = t.rental_id
          where t.counterparty_id = cp and t.is_active and t.rental_id = any (public.app_rentals_for(cp))
            and coalesce(t.move_in_date, ar.start_date) < v_today)
      loop
        if public.app_remind('recap', r.cp, to_char(v_today - 1, 'YYYY-MM'),
          jsonb_build_object(
            'fr', 'Votre récap ' || case when v_m in (4, 8, 10) then 'd’' else 'de ' end || v_month_fr[v_m] || ' est prêt',
            'en', 'Your ' || v_month_en[v_m] || ' recap is ready'),
          jsonb_build_object(
            'fr', 'Vos lieux, vos photos et votre portugais du mois, en histoires à partager.',
            'en', 'Your places, photos and Portuguese of the month, as stories to share.'),
          '/recap') then v_count := v_count + 1; end if;
      end loop;
    end if;

  -- Uma semana antes da saída.
  elsif p_kind = 'checkout' then
    for r in
      select distinct cp, t.rental_id
      from public.app_reminder_students() as cp
      join public.rental_tenants t on t.counterparty_id = cp and t.is_active
      left join public.apartment_departures d on d.rental_id = t.rental_id and d.tenant_id = cp
      where t.rental_id = any (public.app_rentals_for(cp))
        and coalesce(d.departure_date, t.move_out_date) = v_today + 7
    loop
      if public.app_remind('checkout', r.cp, r.rental_id::text,
        jsonb_build_object('fr', 'Départ dans une semaine', 'en', 'Moving out in a week'),
        jsonb_build_object(
          'fr', 'Le check-out, les clés et la caution : tout est expliqué dans l’app.',
          'en', 'Check-out, keys and deposit: it’s all explained in the app.'),
        '/apartment/checkout') then v_count := v_count + 1; end if;
    end loop;

  -- Pesquisa de satisfação: quando a janela abre (mesma regra da app-feedback: meio aos 45% da estadia, fim 21 dias
  -- antes do fim até 30 dias depois), se ainda não respondeu.
  elsif p_kind = 'survey' then
    for r in
      with s as (
        select cp, public.app_rental_for(cp) as rental_id,
          (select ar.start_date from public.apartment_rentals ar where ar.id = public.app_rental_for(cp)) as start_d,
          (select max(ar.end_date) from public.apartment_rentals ar where ar.id = any (public.app_rentals_for(cp))) as end_d
        from public.app_reminder_students() as cp),
      w as (
        select s.*, (s.end_d - 21) as end_opens,
          (s.start_d + ceil(greatest(s.end_d - s.start_d, 1) * 0.45)::int) as mid_opens
        from s where s.start_d is not null and s.end_d is not null)
      select w.cp, w.rental_id,
        case when v_today between w.end_opens and w.end_d + 30 then 'end'
             when v_today between w.mid_opens and w.end_opens - 1 then 'mid' end as kind
      from w
    loop
      continue when r.kind is null;
      continue when exists (select 1 from public.app_surveys x where x.counterparty_id = r.cp and x.rental_id = r.rental_id and x.kind = r.kind);
      if public.app_remind('survey', r.cp, r.rental_id::text || ':' || r.kind,
        case when r.kind = 'end'
          then jsonb_build_object('fr', 'Votre séjour touche à sa fin : votre avis ?', 'en', 'Your stay is ending: how was it?')
          else jsonb_build_object('fr', 'Comment se passe votre séjour ?', 'en', 'How is your stay going?') end,
        jsonb_build_object('fr', 'Deux minutes pour aider l’équipe à faire mieux.', 'en', 'Two minutes to help the team do better.'),
        '/survey') then v_count := v_count + 1; end if;
    end loop;

  -- Frase em português da semana (segunda-feira).
  elsif p_kind = 'portuguese' then
    for r in
      select cp, ph.*
      from public.app_reminder_students() as cp
      cross join lateral (
        select p.* from public.app_pt_phrases p
        order by p.ord
        offset ((extract(isoyear from v_today)::int * 53 + extract(week from v_today)::int)
                % greatest((select count(*) from public.app_pt_phrases), 1))
        limit 1) ph
    loop
      if public.app_remind('portuguese', r.cp, to_char(v_today, 'IYYY-IW'),
        jsonb_build_object('fr', 'Le portugais de la semaine : « ' || r.pt || ' »', 'en', 'Portuguese of the week: “' || r.pt || '”'),
        jsonb_build_object(
          'fr', r.fr || coalesce(' · Prononcez : ' || r.say, ''),
          'en', r.en),
        '/portuguese') then v_count := v_count + 1; end if;
    end loop;
  end if;
  return v_count;
end;
$$;
revoke all on function public.app_send_reminders(text, date) from public, anon, authenticated;

-- ---------- despesa nova: na hora, para cada colega com parte nela (menos quem lançou) ----------
create or replace function public.app_expense_share_notify()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  e record;
  v_who text;
begin
  select x.* into e from public.app_expenses x where x.id = new.expense_id;
  if e.id is null or new.counterparty_id = e.created_by or coalesce(new.amount_cents, 0) <= 0 then
    return null;
  end if;
  -- Só quem pode receber (conta ativa): o resto não tem sino.
  if not exists (select 1 from public.app_students s where s.counterparty_id = new.counterparty_id and s.status = 'active' and s.deleted_at is null) then
    return null;
  end if;
  select coalesce(nullif(trim(s.display_name), ''), split_part(c.name, ' ', 1)) into v_who
  from public.finance_counterparties c left join public.app_students s on s.counterparty_id = c.id
  where c.id = e.created_by;
  perform public.app_remind('expense', new.counterparty_id, e.id::text,
    jsonb_build_object('fr', coalesce(v_who, 'Un coloc') || ' a ajouté une dépense', 'en', coalesce(v_who, 'A roommate') || ' added an expense'),
    jsonb_build_object(
      'fr', '« ' || e.description || ' » : votre part ' || public.app_money(new.amount_cents, e.currency) || '.',
      'en', '“' || e.description || '”: your share ' || public.app_money(new.amount_cents, e.currency) || '.'),
    '/expenses/' || e.id);
  return null;
end;
$$;
revoke all on function public.app_expense_share_notify() from public, anon, authenticated;
drop trigger if exists app_expense_share_notify on public.app_expense_shares;
create trigger app_expense_share_notify after insert on public.app_expense_shares
  for each row execute function public.app_expense_share_notify();

-- ---------- agendamentos (horário de BH = UTC−3) ----------
select cron.unschedule(jobid) from cron.job
where jobname in ('app-reminders-rent', 'app-reminders-cleaning', 'app-reminders-morning', 'app-reminders-evening', 'app-reminders-portuguese');
-- 10h: aluguel, chegada amanhã, recap (dia 1), saída em uma semana, pesquisa.
select cron.schedule('app-reminders-morning', '0 13 * * *',
  $c$select public.app_send_reminders('rent'), public.app_send_reminders('arrival'), public.app_send_reminders('recap'),
            public.app_send_reminders('checkout'), public.app_send_reminders('survey')$c$);
-- 18h: faxina, feriado e evento de amanhã.
select cron.schedule('app-reminders-evening', '0 21 * * *',
  $c$select public.app_send_reminders('cleaning'), public.app_send_reminders('holiday'), public.app_send_reminders('event')$c$);
-- Segunda, 10h: a frase em português da semana.
select cron.schedule('app-reminders-portuguese', '0 13 * * 1', $c$select public.app_send_reminders('portuguese')$c$);

commit;
