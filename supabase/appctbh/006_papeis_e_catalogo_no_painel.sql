-- appctbh: o que o painel do site precisa para editar o catálogo de extras.
--
-- 1) Só no appctbh: cópia de app_role, user_roles e has_role do site (iguais ao banco do site em
--    08/11/2026), para testar o painel apontando para cá. NO SITE ISSO JÁ EXISTE: não aplicar lá.
-- 2) No site também (quando a onda 6 for aprovada): as políticas abaixo, que deixam a equipe
--    (admin e equipe) ler e editar o catálogo pela tela do painel, com o login do site.

-- ---------- 1) só appctbh ----------
create type public.app_role as enum ('admin', 'user', 'student', 'contador', 'equipe', 'marketing');

create table public.user_roles (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- ---------- 2) site e appctbh ----------
create policy "Equipe le o catalogo de extras" on public.app_service_catalog
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));

create policy "Equipe edita o catalogo de extras" on public.app_service_catalog
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));

grant select, insert, update, delete on public.app_service_catalog to authenticated;
