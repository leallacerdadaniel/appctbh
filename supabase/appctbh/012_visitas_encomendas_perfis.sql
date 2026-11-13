-- 012: a vida no prédio (pedido do dono em 08/11/2026): visitas avisadas à portaria, encomendas e o perfil
-- de cada aluno para os colegas de apartamento.
-- Só no projeto de desenvolvimento appctbh (gxhvhacqemdwwebsftcd). Para produção, só com aprovação do Daniel.
--
-- O app grava tudo pela função app-house (chave de serviço, token próprio do app). A equipe lê pelo painel
-- (login do site) e, nas encomendas, registra a chegada na portaria: o gatilho avisa o aluno pelo sino.
-- O número da portaria fica em app_apartment_info.building_info ->> 'portaria_whatsapp' (a equipe preenche).

-- ---------- visitas: o aluno diz quem vem; o app prepara a mensagem em português para o porteiro ----------
create table if not exists public.app_visitors (
  id uuid primary key default gen_random_uuid(),
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  visit_date date not null,
  visit_time time,
  note text check (note is null or char_length(note) <= 200),
  status text not null default 'planned' check (status in ('planned', 'cancelled')),
  -- quando o aluno abriu o WhatsApp para avisar a portaria (some se ele mudar nome, dia ou hora)
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists app_visitors_student_idx on public.app_visitors (counterparty_id, visit_date);
create index if not exists app_visitors_rental_idx on public.app_visitors (rental_id, visit_date) where status = 'planned';

-- ---------- encomendas: attendu (expected) → arrivé (arrived, a equipe marca) → récupéré (picked_up) ----------
create table if not exists public.app_packages (
  id uuid primary key default gen_random_uuid(),
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  description text not null check (char_length(trim(description)) between 1 and 80),
  carrier text check (carrier is null or char_length(carrier) <= 60),
  expected_date date,
  status text not null default 'expected' check (status in ('expected', 'arrived', 'picked_up', 'cancelled')),
  -- recado da equipe ao marcar a chegada ("caixa grande, com o porteiro da noite")
  team_note text check (team_note is null or char_length(team_note) <= 200),
  arrived_at timestamptz,
  picked_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists app_packages_student_idx on public.app_packages (counterparty_id, created_at desc);
create index if not exists app_packages_open_idx on public.app_packages (rental_id) where status in ('expected', 'arrived');

-- Carimbos de hora: a equipe só muda o status (update ... set status = 'arrived').
create or replace function public.app_packages_stamp()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if new.status = 'expected' then
    new.arrived_at := null;
    new.picked_up_at := null;
  end if;
  if new.status = 'arrived' and new.arrived_at is null then
    new.arrived_at := now();
  end if;
  if new.status = 'picked_up' and new.picked_up_at is null then
    new.picked_up_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists app_packages_stamp on public.app_packages;
create trigger app_packages_stamp before insert or update on public.app_packages
  for each row execute function public.app_packages_stamp();
revoke execute on function public.app_packages_stamp() from public, anon, authenticated;

-- Chegou na portaria → aviso para o aluno (o sino; o push da onda 9 lê a mesma tabela).
-- Vale também quando a equipe cadastra direto como 'arrived' uma encomenda que o aluno não tinha avisado.
create or replace function public.app_packages_notify()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare
  v_what text;
  v_note text;
begin
  if new.status <> 'arrived' then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.status = 'arrived' then
    return null;
  end if;
  v_what := trim(new.description) || coalesce(' · ' || nullif(trim(new.carrier), ''), '');
  v_note := coalesce(' ' || nullif(trim(new.team_note), ''), '');
  insert into public.app_notices (audience, counterparty_id, title, body, href)
  values (
    'student', new.counterparty_id,
    '{"fr":"Votre colis est arrivé à la portaria","en":"Your package has arrived at the portaria","pt":"Sua encomenda chegou na portaria"}'::jsonb,
    jsonb_build_object(
      'fr', v_what || '. Passez le chercher à la portaria, puis marquez-le comme récupéré dans l’app.' || v_note,
      'en', v_what || '. Pick it up at the portaria, then mark it as picked up in the app.' || v_note,
      'pt', v_what || '. Retire na portaria e depois marque como retirada no app.' || v_note),
    '/house/packages');
  return null;
end;
$$;
drop trigger if exists app_packages_notify on public.app_packages;
create trigger app_packages_notify after insert or update of status on public.app_packages
  for each row execute function public.app_packages_notify();
revoke execute on function public.app_packages_notify() from public, anon, authenticated;

-- ---------- perfil para os colegas: um por aluno, invisível até o aluno ligar "Visible par mes colocataires" ----------
create table if not exists public.app_profiles (
  counterparty_id uuid primary key references public.finance_counterparties(id) on delete cascade,
  -- locação em que o aluno salvou por último (para o painel); quem vê é decidido na hora, pelos colegas ativos
  rental_id uuid references public.apartment_rentals(id) on delete set null,
  school text check (school is null or char_length(school) <= 80),
  hometown text check (hometown is null or char_length(hometown) <= 80),
  -- códigos ISO 639-1 ("fr", "en", "pt")
  languages text[] not null default '{}'
    check (cardinality(languages) <= 8 and array_to_string(languages, ',') ~ '^([a-z]{2}(,[a-z]{2})*)?$'),
  instagram text check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  about text check (about is null or char_length(about) <= 140),
  -- consentimento (LGPD): desligado por padrão
  visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists app_profiles_rental_idx on public.app_profiles (rental_id);

-- ---------- acesso: o app passa pela app-house (chave de serviço); a equipe lê pelo painel ----------
alter table public.app_visitors enable row level security;
alter table public.app_packages enable row level security;
alter table public.app_profiles enable row level security;

revoke all on public.app_visitors, public.app_packages, public.app_profiles from anon, authenticated;
grant select on public.app_visitors, public.app_profiles to authenticated;
grant select, insert, update on public.app_packages to authenticated;

create policy "Equipe le visitas" on public.app_visitors for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe le perfis" on public.app_profiles for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe le encomendas" on public.app_packages for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
-- A equipe registra a chegada na portaria (update do status) ou cadastra uma encomenda que chegou sem aviso.
create policy "Equipe registra encomendas" on public.app_packages for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe marca chegada das encomendas" on public.app_packages for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));

-- ---------- dados de teste FICTÍCIOS (só appctbh): apartamento, locação e alunos do 003 ----------
-- Número de mentira da portaria do prédio de teste.
update public.app_apartment_info
set building_info = coalesce(building_info, '{}'::jsonb) || '{"portaria_whatsapp": "+55 31 90000-0000"}'::jsonb
where apartment_id = '00000000-0000-4000-a000-000000000001';

-- Léa: uma visita no próximo sábado às 20h (portaria ainda não avisada) e uma passada.
insert into public.app_visitors (id, counterparty_id, rental_id, name, visit_date, visit_time, note, notified_at) values
  ('00000000-0000-4000-a000-000000000501', '00000000-0000-4000-a000-000000000101', '00000000-0000-4000-a000-000000000010',
   'João Silva', current_date + (((6 - extract(dow from current_date)::int) + 6) % 7) + 1, '20:00', 'Dîner à la maison', null),
  ('00000000-0000-4000-a000-000000000502', '00000000-0000-4000-a000-000000000101', '00000000-0000-4000-a000-000000000010',
   'Camille Petit', current_date - 5, '15:00', null, now() - interval '5 days')
on conflict (id) do nothing;

-- Léa: um colis attendu, um arrivé (o insert dispara o aviso do sino) e um récupéré.
insert into public.app_packages (id, counterparty_id, rental_id, description, carrier, expected_date, status, arrived_at, picked_up_at) values
  ('00000000-0000-4000-a000-000000000601', '00000000-0000-4000-a000-000000000101', '00000000-0000-4000-a000-000000000010',
   'Livres de portugais', 'Amazon', current_date + 2, 'expected', null, null),
  ('00000000-0000-4000-a000-000000000602', '00000000-0000-4000-a000-000000000101', '00000000-0000-4000-a000-000000000010',
   'Chargeur de téléphone', 'Mercado Livre', current_date - 1, 'arrived', null, null),
  ('00000000-0000-4000-a000-000000000603', '00000000-0000-4000-a000-000000000101', '00000000-0000-4000-a000-000000000010',
   'Adaptateur de prise', 'Shopee', current_date - 10, 'picked_up', now() - interval '9 days', now() - interval '8 days')
on conflict (id) do nothing;

-- Hugo mostra o perfil aos colegas; Chloé preencheu mas deixou invisível; Léa ainda não preencheu (testar a criação).
insert into public.app_profiles (counterparty_id, rental_id, school, hometown, languages, instagram, about, visible) values
  ('00000000-0000-4000-a000-000000000102', '00000000-0000-4000-a000-000000000010', 'Sciences Po Paris', 'Lyon, France',
   '{fr,en,es}', 'hugo.teste.ctbh', 'Toujours partant pour un match de foot ou un pão de queijo.', true),
  ('00000000-0000-4000-a000-000000000103', '00000000-0000-4000-a000-000000000010', 'ESCP', 'Bordeaux, France',
   '{fr,en}', null, 'J’adore cuisiner pour tout le monde.', false)
on conflict (counterparty_id) do nothing;
