-- appctbh: dados fictícios da comunidade para testar o app e o painel (09/11/2026). Só no desenvolvimento.
-- Léa (…0101) é a conta de teste; Hugo (…0102) e Chloé (…0103) são as colegas dela, sem acesso ao app.
-- O evento publicado gera um aviso para todos (gatilho app_community_events_notify).
do $$
declare
  lea uuid := '00000000-0000-4000-a000-000000000101';
  hugo uuid := '00000000-0000-4000-a000-000000000102';
  chloe uuid := '00000000-0000-4000-a000-000000000103';
  rental uuid := '00000000-0000-4000-a000-000000000010';
  crepes uuid := '00000000-0000-4000-c000-000000000001';
  trip uuid := '00000000-0000-4000-c000-000000000010';
  apero uuid := '00000000-0000-4000-c000-000000000020';
begin
  insert into public.app_community_posts (id, author_cp, rental_id, scope, kind, body, status, ai_verdict, created_at) values
    ('00000000-0000-4000-c000-000000000002', hugo, rental, 'all', 'question',
     'Quelqu’un connaît un bon coiffeur près de la Savassi ? Pas trop cher si possible.', 'published', 'ok', now() - interval '3 hours'),
    (crepes, chloe, rental, 'apartment', 'post',
     'Je fais des crêpes dimanche soir, qui est partant ? J’ai besoin de quelqu’un pour acheter le lait.', 'published', 'ok', now() - interval '1 day'),
    ('00000000-0000-4000-c000-000000000003', chloe, rental, 'all', 'giveaway',
     'Je donne un ventilateur et une bouilloire avant de partir en décembre. Premier arrivé, premier servi.', 'published', 'unchecked', now() - interval '2 days')
  on conflict (id) do nothing;

  -- Um post retido pela IA, para a fila "Para revisar" do painel.
  insert into public.app_community_posts (id, author_cp, rental_id, scope, kind, body, status, ai_verdict, ai_reason, ai_checked_at, created_at)
  values ('00000000-0000-4000-c000-000000000004', hugo, rental, 'all', 'post',
          'Quelqu’un peut me prêter 300 reais jusqu’à la fin du mois ? Je rembourse promis.', 'pending', 'review',
          '{"pt":"Pedido de dinheiro emprestado: a equipe decide se publica.","fr":"L’équipe va relire votre message avant de le publier.","en":"The team will read your post before publishing it.","categories":["other"]}',
          now() - interval '20 minutes', now() - interval '20 minutes')
  on conflict (id) do nothing;

  insert into public.app_community_comments (id, post_id, author_cp, body, status, ai_verdict, created_at)
  values ('00000000-0000-4000-c000-000000000005', crepes, hugo, 'Moi ! Je passe au Verdemar demain.', 'published', 'ok', now() - interval '20 hours')
  on conflict (id) do nothing;

  insert into public.app_trips (id, creator_cp, destination, destination_id, starts_on, ends_on, seats, description, whatsapp_link, status, ai_verdict)
  values (trip, hugo, 'Ouro Preto', 'ouro-preto', current_date + 12, current_date + 13, 6,
          'Bus Pássaro Verde le samedi à 7 h, retour dimanche soir. Pousada à partager, environ R$ 120 par personne.',
          'https://chat.whatsapp.com/TesteChezToi12345', 'published', 'ok')
  on conflict (id) do nothing;
  insert into public.app_trip_members (trip_id, counterparty_id) values (trip, hugo), (trip, chloe) on conflict do nothing;

  insert into public.app_community_events (id, title, description, starts_at, ends_at, venue, address, capacity, status)
  values (apero,
          '{"fr":"Apéro de bienvenue Chez Toi","en":"Chez Toi welcome drinks"}',
          '{"fr":"Pour se rencontrer entre résidents : boissons et petits plats offerts par la Chez Toi.","en":"To meet the other residents: drinks and snacks on Chez Toi."}',
          (current_date + 10 + time '19:00') at time zone 'America/Sao_Paulo',
          (current_date + 10 + time '22:00') at time zone 'America/Sao_Paulo',
          'Terraço de teste', 'Rua Exemplo, 100, Savassi', 30, 'published')
  on conflict (id) do nothing;
  insert into public.app_community_event_rsvps (event_id, counterparty_id, going) values (apero, hugo, true) on conflict do nothing;
end $$;
