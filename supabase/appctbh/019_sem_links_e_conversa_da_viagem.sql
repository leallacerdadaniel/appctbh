-- appctbh (09/11/2026). Pedido do Daniel: "eles não devem poder colocar um link aí, porque se for malicioso nos
-- complicamos. Em nenhum lugar, na verdade". Duas mudanças:
--
-- 1) Nenhum texto escrito pelo aluno aceita link. app_has_link reconhece http(s)://, www. e nome de domínio
--    (exemplo.com, bit.ly/x, wa.me/…, e-mail). As regras valem para linhas novas e editadas (NOT VALID: o que já
--    existe não é conferido). As funções e o app avisam antes, com mensagem clara; o banco é a última barreira.
--    O Instagram do perfil continua: aceita só o nome de usuário (012), e o app monta o endereço do Instagram.
-- 2) A viagem em grupo perde o link do grupo do WhatsApp; no lugar, uma conversa da viagem dentro do app, só para
--    quem vai, moderada como os comentários do mural (app_community_comments.trip_id).

create or replace function public.app_has_link(t text)
returns boolean language sql immutable as $$
  select coalesce(t, '') ~* '(https?://|www\.|[a-z0-9-]+\.(com|net|org|br|fr|io|me|ly|gl|co|app|link|info|xyz|site|online|shop|store|tv|gg|to|be|us|eu|es|it|de|uk|ai|dev|page|club|live|click|top|vip|lat|pro|biz|cc|ws|tk|gov|edu)\M)'
$$;

alter table public.app_community_posts add constraint app_community_posts_no_links check (not public.app_has_link(body)) not valid;
alter table public.app_community_comments add constraint app_community_comments_no_links check (not public.app_has_link(body)) not valid;
alter table public.app_trips add constraint app_trips_no_links
  check (not public.app_has_link(destination) and not public.app_has_link(description)) not valid;
alter table public.app_community_reports add constraint app_community_reports_no_links check (not public.app_has_link(note)) not valid;
alter table public.app_feedback add constraint app_feedback_no_links check (not public.app_has_link(body)) not valid;
alter table public.app_surveys add constraint app_surveys_no_links check (not public.app_has_link(comment)) not valid;
alter table public.app_visitors add constraint app_visitors_no_links
  check (not public.app_has_link(name) and not public.app_has_link(note)) not valid;
alter table public.app_packages add constraint app_packages_no_links
  check (not public.app_has_link(description) and not public.app_has_link(carrier)) not valid;
alter table public.app_profiles add constraint app_profiles_no_links
  check (not public.app_has_link(school) and not public.app_has_link(hometown) and not public.app_has_link(about)) not valid;
alter table public.app_expenses add constraint app_expenses_no_links check (not public.app_has_link(description)) not valid;
alter table public.app_chores add constraint app_chores_no_links check (not public.app_has_link(name)) not valid;
alter table public.app_cleaning_feedback add constraint app_cleaning_feedback_no_links check (not public.app_has_link(comment)) not valid;
alter table public.app_requests add constraint app_requests_no_links
  check (not public.app_has_link(description) and not public.app_has_link(note) and not public.app_has_link(room)
         and not public.app_has_link(rating_comment)) not valid;

-- 2) conversa da viagem
alter table public.app_community_comments alter column post_id drop not null;
alter table public.app_community_comments add column if not exists trip_id uuid references public.app_trips(id) on delete cascade;
alter table public.app_community_comments add constraint app_community_comments_one_parent
  check ((post_id is null) <> (trip_id is null));
create index if not exists app_community_comments_trip on public.app_community_comments (trip_id, created_at) where trip_id is not null;

-- Aplicar DEPOIS de publicar a app-community que já não lê a coluna:
-- alter table public.app_trips drop column whatsapp_link;
