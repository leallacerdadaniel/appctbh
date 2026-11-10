-- 023: a data dos avisos, escrita na língua de quem lê (10/11/2026).
--
-- O gatilho dos eventos da Chez Toi (015, app_community_events_notify) escrevia a hora do evento como
-- 'DD/MM HH24:MI' nas duas línguas: o aluno de língua inglesa lia "19/11 19:00". Agora cada língua tem o
-- formato que o app já usa nas telas (src/lib/format.ts):
--   fr  "19/11 à 19h00"   (9h45 de manhã, sem zero à esquerda, como formatTime)
--   en  "Nov 19, 7:00 PM"
-- Sempre no horário de Belo Horizonte. O nome do mês em inglês vem de uma lista fixa e o resto são números,
-- então nada aqui depende do locale do servidor (lc_time).
--
-- Conferido em 10/11/2026 (grep em supabase/appctbh e supabase/functions, e pg_proc do appctbh): este é o único
-- lugar que põe data formatada em app_notices. Pedidos (008), encomendas (012), feedback e indicação (016),
-- moderação e suspensão (015) e os avisos da app-community não escrevem data.
--
-- Só troca funções: nenhuma tabela, nenhum dado. Os avisos já gravados ficam como estão.

-- A hora de um aviso nas duas línguas: { "fr": "19/11 à 19h00", "en": "Nov 19, 7:00 PM" }.
create or replace function public.app_notice_when(p_at timestamptz)
returns jsonb language sql stable set search_path to 'public' as $$
  select jsonb_build_object(
    'fr', to_char(l, 'DD/MM') || ' à ' || extract(hour from l)::int || 'h' || to_char(l, 'MI'),
    'en', (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[extract(month from l)::int]
          || ' ' || extract(day from l)::int || ', '
          || ((extract(hour from l)::int + 11) % 12 + 1) || ':' || to_char(l, 'MI')
          || case when extract(hour from l) < 12 then ' AM' else ' PM' end)
  from (select p_at at time zone 'America/Sao_Paulo' as l) t;
$$;
revoke execute on function public.app_notice_when(timestamptz) from public, anon, authenticated;

-- O mesmo gatilho da 015, com a hora em cada língua.
create or replace function public.app_community_events_notify()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_when jsonb := public.app_notice_when(new.starts_at);
  v_body jsonb := jsonb_build_object(
    'fr', (v_when->>'fr') || ' · ' || new.venue,
    'en', (v_when->>'en') || ' · ' || new.venue);
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    insert into public.app_notices (audience, title, body, href, created_by)
    values ('all',
      jsonb_build_object('fr', 'Événement Chez Toi : ' || (new.title->>'fr'), 'en', 'Chez Toi event: ' || (new.title->>'en')),
      v_body,
      '/community/events/' || new.id, new.created_by);
  elsif tg_op = 'UPDATE' and new.status = 'cancelled' and old.status = 'published' then
    insert into public.app_notices (audience, title, body, href, created_by)
    values ('all',
      jsonb_build_object('fr', 'Événement annulé : ' || (new.title->>'fr'), 'en', 'Event cancelled: ' || (new.title->>'en')),
      v_body,
      '/community/events/' || new.id, new.created_by);
  end if;
  return null;
end;
$$;
revoke execute on function public.app_community_events_notify() from public, anon, authenticated;
