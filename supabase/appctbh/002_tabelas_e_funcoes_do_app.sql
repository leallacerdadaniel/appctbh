-- appctbh (gxhvhacqemdwwebsftcd): as tabelas app_* e as funções que a app-api chama,
-- copiadas do banco do site em 08/11/2026 (pg_get_functiondef), não das migrações do Arthur,
-- que podem estar atrás do que está no ar. Diferença: app_settings sem os ids reais de
-- locações excluídas e com a janela de acesso do semestre de teste (ver 003).

create table public.app_students (
  counterparty_id uuid not null primary key references public.finance_counterparties(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  status text not null default 'no_access' check (status = any (array['no_access','invited','active','disabled'])),
  must_change_password boolean not null default true,
  last_login_at timestamptz, last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  display_name text,
  login_count integer not null default 0,
  password_hash text,
  session_version integer not null default 0,
  birthday_greeted_year integer,
  usage_excluded boolean not null default false
);

create table public.app_settings (
  id boolean not null default true primary key check (id),
  access_start date not null default '2027-01-01',
  access_end date not null default '2027-05-31',
  excluded_rental_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.app_apartment_info (
  apartment_id uuid not null primary key references public.apartments(id) on delete cascade,
  wifi_name text, wifi_password text,
  trash_info jsonb not null default '{}'::jsonb,
  house_rules jsonb not null default '{}'::jsonb,
  building_info jsonb not null default '{}'::jsonb,
  student_notes jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  unit_number text
);

create table public.app_apartment_places (
  apartment_id uuid not null primary key references public.apartments(id) on delete cascade,
  nearby jsonb not null,
  times jsonb not null,
  computed_at timestamptz not null default now()
);

create table public.app_rental_continuations (
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  continues_rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  note text,
  primary key (rental_id, continues_rental_id),
  check (rental_id <> continues_rental_id)
);

create table public.app_cleaning_feedback (
  cleaning_id uuid not null references public.cleaning_records(id) on delete cascade,
  counterparty_id uuid not null references public.finance_counterparties(id),
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text not null default '' check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cleaning_id, counterparty_id)
);
create index app_cleaning_feedback_rental_idx on public.app_cleaning_feedback (rental_id);

create table public.app_expenses (
  id uuid not null default gen_random_uuid() primary key,
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  description text not null check (char_length(trim(description)) between 1 and 80),
  amount_cents integer not null check (amount_cents > 0 and amount_cents <= 10000000),
  paid_by uuid not null references public.finance_counterparties(id),
  spent_on date not null default current_date,
  split_mode text not null default 'equal' check (split_mode = any (array['equal','exact'])),
  created_by uuid not null references public.finance_counterparties(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  currency text not null default 'BRL' check (currency = any (array['BRL','EUR']))
);
create index app_expenses_rental_idx on public.app_expenses (rental_id, spent_on desc);

create table public.app_expense_shares (
  expense_id uuid not null references public.app_expenses(id) on delete cascade,
  counterparty_id uuid not null references public.finance_counterparties(id),
  amount_cents integer not null check (amount_cents >= 0),
  primary key (expense_id, counterparty_id)
);

create table public.app_settlements (
  id uuid not null default gen_random_uuid() primary key,
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  from_cp uuid not null references public.finance_counterparties(id),
  to_cp uuid not null references public.finance_counterparties(id),
  amount_cents integer not null check (amount_cents > 0 and amount_cents <= 10000000),
  paid_on date not null default current_date,
  created_by uuid not null references public.finance_counterparties(id),
  created_at timestamptz not null default now(),
  currency text not null default 'BRL' check (currency = any (array['BRL','EUR'])),
  check (from_cp <> to_cp)
);
create index app_settlements_rental_idx on public.app_settlements (rental_id, paid_on desc);

create table public.app_events (
  id bigint generated always as identity primary key,
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  kind text not null check (kind = any (array['screen','action'])),
  name text not null,
  item text,
  occurred_at timestamptz not null default now()
);
create index app_events_occurred_idx on public.app_events (occurred_at);
create index app_events_student_idx on public.app_events (counterparty_id, occurred_at);

create table public.app_searches (
  id bigint generated always as identity primary key,
  query text not null,
  results integer not null default 0,
  occurred_at timestamptz not null default now()
);
create index app_searches_occurred_idx on public.app_searches (occurred_at);

alter table public.app_students enable row level security;
alter table public.app_settings enable row level security;
alter table public.app_apartment_info enable row level security;
alter table public.app_apartment_places enable row level security;
alter table public.app_rental_continuations enable row level security;
alter table public.app_cleaning_feedback enable row level security;
alter table public.app_expenses enable row level security;
alter table public.app_expense_shares enable row level security;
alter table public.app_settlements enable row level security;
alter table public.app_events enable row level security;
alter table public.app_searches enable row level security;

-- ---------- funções (iguais às do site em 08/11/2026) ----------

create or replace function public.app_login_lookup(p_email text)
returns table(counterparty_id uuid, password_hash text, status text, must_change_password boolean, session_version integer)
language sql stable security definer set search_path to 'public' as $$
  select s.counterparty_id, s.password_hash, s.status, s.must_change_password, s.session_version
  from public.app_students s
  join public.finance_counterparties c on c.id = s.counterparty_id
  where lower(trim(c.email)) = lower(trim(p_email))
    and s.password_hash is not null
$$;

create or replace function public.app_rental_for(p_cp uuid)
returns uuid language sql stable security definer set search_path to 'public' as $$
  select r.id
  from public.app_students s
  join public.rental_tenants t on t.counterparty_id = s.counterparty_id and t.is_active
  join public.apartment_rentals r on r.id = t.rental_id
  cross join public.app_settings cfg
  where s.counterparty_id = p_cp
    and s.status = 'active'
    and r.status = 'active'
    and r.id <> all (cfg.excluded_rental_ids)
    and r.start_date <= cfg.access_end
    and r.end_date >= cfg.access_start
  order by (current_date between r.start_date and r.end_date) desc,
           (r.start_date >= current_date) desc,
           abs(r.start_date - current_date)
  limit 1
$$;

create or replace function public.app_rentals_for(p_cp uuid)
returns uuid[] language sql stable security definer set search_path to 'public' as $$
  select case when public.app_rental_for(p_cp) is null then null else
    array[public.app_rental_for(p_cp)] || coalesce(array(
      select c.continues_rental_id
      from public.app_rental_continuations c
      join public.rental_tenants t on t.rental_id = c.continues_rental_id
                                  and t.counterparty_id = p_cp and t.is_active
      where c.rental_id = public.app_rental_for(p_cp)), '{}')
  end;
$$;

create or replace function public.app_home_for(p_cp uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare
  v_rental uuid := public.app_rental_for(p_cp);
  v_rentals uuid[] := public.app_rentals_for(p_cp);
  result jsonb;
begin
  if v_rental is null then
    return null;
  end if;

  select jsonb_build_object(
    'student', (select jsonb_build_object('name', coalesce(nullif(trim(s.display_name), ''), c.name), 'email', c.email)
                from public.finance_counterparties c
                left join public.app_students s on s.counterparty_id = c.id
                where c.id = p_cp),
    'must_change_password', (select must_change_password from public.app_students where counterparty_id = p_cp),
    'apartment', jsonb_build_object(
      'title', a.title, 'location', a.location, 'address_complement', a.address_complement,
      'latitude', a.latitude, 'longitude', a.longitude,
      'photo', a.card_image_url
    ),
    'rental', jsonb_build_object(
      'name', r.nickname,
      'semester', r.semester, 'start_date', r.start_date,
      'end_date', (select max(x.end_date) from public.apartment_rentals x where x.id = any(v_rentals)),
      'cleaning_day', r.cleaning_day, 'cleaning_frequency', r.cleaning_frequency,
      'cleaning_time', r.cleaning_time,
      'currency', case when r.contract_type = 'commission_eur' then 'EUR' else 'BRL' end,
      'contract_rent', case when r.contract_type = 'commission_eur' then r.contract_value_eur else r.monthly_rent end,
      'has_contract', exists (select 1 from public.rental_contracts k
                              where k.rental_id = r.id and k.file_path is not null)
    ),
    'tenant', (select jsonb_build_object('move_in_date', min(t.move_in_date), 'move_out_date', max(t.move_out_date),
                                         'rent', (array_agg(t.individual_rent) filter (where t.rental_id = r.id))[1])
               from public.rental_tenants t
               where t.rental_id = any(v_rentals) and t.counterparty_id = p_cp and t.is_active
               having count(*) > 0),
    'info', (select to_jsonb(i) - 'updated_by' - 'updated_at'
             from public.app_apartment_info i where i.apartment_id = a.id),
    'roommates', coalesce((select jsonb_agg(coalesce(nullif(trim(s.display_name), ''), c.name)
                                            order by coalesce(nullif(trim(s.display_name), ''), c.name))
                           from public.rental_tenants t
                           join public.finance_counterparties c on c.id = t.counterparty_id
                           left join public.app_students s on s.counterparty_id = t.counterparty_id
                           where t.rental_id = r.id and t.is_active and t.counterparty_id <> p_cp), '[]'::jsonb),
    'cleanings', coalesce((select jsonb_agg(jsonb_build_object(
                              'id', k.id,
                              'date', k.scheduled_date, 'time', k.scheduled_time,
                              'completed', k.completed, 'completed_at', k.completed_at,
                              'feedback_until', greatest(k.scheduled_date, (k.completed_at at time zone 'America/Sao_Paulo')::date) + 7,
                              'feedback', (select jsonb_build_object('rating', f.rating, 'comment', f.comment)
                                           from public.app_cleaning_feedback f
                                           where f.cleaning_id = k.id and f.counterparty_id = p_cp))
                            order by k.scheduled_date)
                           from public.cleaning_records k where k.rental_id = any(v_rentals)), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('month', m.month_year, 'paid', m.paid) order by m.month_year)
                          from (select p.month_year, bool_and(p.status = 'paid') as paid
                                from public.student_payments p
                                join public.rental_tenants t on t.id = p.tenant_id
                                where t.rental_id = any(v_rentals) and t.counterparty_id = p_cp
                                  and coalesce(lower(p.payment_type), 'rent') = 'rent'
                                group by p.month_year) m), '[]'::jsonb),
    'deposit', (select jsonb_build_object('amount', d.amount - coalesce((select sum(x.amount)
                                                                          from public.security_deposit_deductions x
                                                                          where x.deposit_id = d.id), 0),
                                          'currency', d.currency,
                                          'status', d.status, 'returned_date', d.returned_date)
                from public.security_deposits d
                where d.rental_id = any(v_rentals) and d.counterparty_id = p_cp
                  and coalesce(d.deposit_type, 'student') <> 'owner'
                order by (d.status = 'returned'), d.created_at desc
                limit 1)
  )
  into result
  from public.apartment_rentals r
  join public.apartments a on a.id = r.apartment_id
  where r.id = v_rental;

  return result;
end;
$$;

create or replace function public.app_claim_birthday(p_cp uuid)
returns boolean language plpgsql security definer set search_path to 'public' as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_year integer := extract(year from v_today)::integer;
  v_birth text;
  v_day text := to_char(v_today, 'MM-DD');
  v_rows integer;
begin
  select to_char(c.date_of_birth, 'MM-DD') into v_birth
  from public.finance_counterparties c
  where c.id = p_cp;

  if v_birth is null then
    return false;
  end if;

  if not (v_birth = v_day
          or (v_birth = '02-29' and v_day = '02-28' and to_char(v_today + 1, 'MM-DD') = '03-01')) then
    return false;
  end if;

  update public.app_students
  set birthday_greeted_year = v_year
  where counterparty_id = p_cp
    and birthday_greeted_year is distinct from v_year;

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

-- Só a app-api (service_role) chama estas funções.
revoke execute on function public.app_login_lookup(text), public.app_rental_for(uuid), public.app_rentals_for(uuid),
  public.app_home_for(uuid), public.app_claim_birthday(uuid) from public, anon, authenticated;
