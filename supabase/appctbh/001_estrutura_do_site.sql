-- appctbh (gxhvhacqemdwwebsftcd): cópia da ESTRUTURA das tabelas do site que a app-api lê.
-- Copiada do banco do site (miucfiiporxhvvbefonh) em 08/11/2026, só pelo catálogo, sem dados.
-- Colunas, tipos, padrões e chaves como no site. Diferença: student_payments sem a chave
-- estrangeira para finance_transactions (o financeiro do site não vem para cá).
-- RLS ligada e sem políticas: só a app-api (chave de serviço) lê e grava, como no site.

create type public.checkin_stage as enum ('contracted', 'done', 'delivered', 'signed');

create table public.finance_counterparties (
  id uuid not null default gen_random_uuid() primary key,
  name text not null,
  type text not null check (type = any (array['client','supplier','both'])),
  document text, email text, phone text, notes text,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  nationality text, cpf text, supplier_subtype text, address text, marital_status text, rg text,
  company_name text, cnpj text, representative_name text, representative_cpf text, roommates_names text,
  emergency_contact_1_name text, emergency_contact_1_contact text,
  emergency_contact_2_name text, emergency_contact_2_contact text,
  passport_url text, passport_number text, skema_acceptance_letter_url text,
  arrival_date date, departure_date date, personal_address text,
  submitted_via_public_form boolean not null default false,
  date_of_birth date
);

create table public.apartments (
  id uuid not null default gen_random_uuid() primary key,
  title text not null,
  description text,
  location text not null,
  price numeric(10,2) not null,
  bedrooms integer,
  bathrooms numeric(3,1),
  area_sqm integer,
  images text[] default '{}'::text[],
  amenities text[] default '{}'::text[],
  available boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  address_complement text,
  latitude numeric(10,8),
  longitude numeric(11,8),
  video_url text,
  distance_to_skema numeric(5,2),
  walking_time integer, driving_time integer,
  nearby_supermarkets jsonb default '[]'::jsonb, nearby_shopping jsonb default '[]'::jsonb,
  nearby_gyms jsonb default '[]'::jsonb, nearby_restaurants jsonb default '[]'::jsonb,
  inclusions_text text, initial_payment_text text,
  availability_start date, availability_end date,
  booking_action text,
  slug text not null unique,
  security_deposit numeric default 0, service_fee numeric default 800, first_month_rent numeric default 0,
  hidden boolean not null default false, featured boolean not null default false,
  link text, reserved boolean not null default false, display_order integer default 0,
  show_on_homepage boolean not null default false, is_new boolean not null default false,
  available_bedrooms integer, max_residents integer, highlight_tag text,
  owner_name text, owner_contact text, show_in_hero boolean not null default false,
  card_image_url text,
  card_image_focal_x numeric not null default 50, card_image_focal_y numeric not null default 50,
  card_image_zoom numeric not null default 1, card_image_source_url text,
  video_path text, reserved_semester text,
  listing_type text not null default 'apartment' check (listing_type = any (array['apartment','development'])),
  video_paths text[] not null default '{}'::text[],
  photo_rooms jsonb not null default '{}'::jsonb,
  price_on_request boolean not null default false,
  semester_prepayment_required boolean not null default false
);

create table public.apartment_rentals (
  id uuid not null default gen_random_uuid() primary key,
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  start_date date not null,
  end_date date,
  contract_duration_months numeric,
  monthly_rent numeric not null default 0,
  ctbh_transfers numeric default 0,
  fee_eur numeric default 0,
  status text not null default 'active' check (status = any (array['active','finished','cancelled'])),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  supplier_id uuid references public.finance_counterparties(id),
  nickname text, cleaning_frequency text, semester text, total_eur_value numeric,
  cleaning_day text, cleaning_time text, transfer_day integer,
  fee_brl numeric not null default 0,
  contract_type text not null default 'standard',
  contract_value_eur numeric, commission_percent numeric
);

create table public.rental_tenants (
  id uuid not null default gen_random_uuid() primary key,
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  individual_rent numeric,
  move_in_date date, move_out_date date,
  exit_penalty numeric default 0, exit_penalty_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  arrival_confirmed_date date, arrival_time time, flight_number text,
  unique (rental_id, counterparty_id)
);

create table public.apartment_departures (
  id uuid not null default gen_random_uuid() primary key,
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  tenant_id uuid not null references public.finance_counterparties(id) on delete cascade,
  contract_end_date date, departure_date date, responsible text, observations text,
  status text not null default 'pending', semester text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  message_sent boolean not null default false,
  checkout_datetime timestamptz,
  constraint apartment_departures_rental_tenant_unique unique (rental_id, tenant_id)
);

create table public.rental_contracts (
  id uuid not null default gen_random_uuid() primary key,
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  contract_type text not null check (contract_type = any (array['owner','tenant'])),
  file_name text not null, file_path text not null, file_size integer,
  monthly_value numeric, contract_notes text,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references auth.users(id),
  unique (rental_id, contract_type)
);

create table public.cleaning_records (
  id uuid not null default gen_random_uuid() primary key,
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  scheduled_date date,
  completed boolean default false,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cost numeric,
  scheduled_time time
);

create table public.security_deposits (
  id uuid not null default gen_random_uuid() primary key,
  tenant_id uuid references public.rental_tenants(id) on delete set null,
  rental_id uuid references public.apartment_rentals(id) on delete set null,
  counterparty_id uuid not null references public.finance_counterparties(id) on delete cascade,
  amount numeric not null,
  currency text not null default 'BRL',
  status text not null default 'pending',
  returned_date date, semester text, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  deposit_type text not null default 'student'
);

create table public.security_deposit_deductions (
  id uuid not null default gen_random_uuid() primary key,
  deposit_id uuid not null references public.security_deposits(id) on delete cascade,
  amount numeric not null,
  description text not null,
  deduction_date date not null default current_date,
  created_at timestamptz default now()
);

create table public.student_payments (
  id uuid not null default gen_random_uuid() primary key,
  tenant_id uuid not null references public.rental_tenants(id) on delete cascade,
  rental_id uuid not null references public.apartment_rentals(id) on delete cascade,
  month_year date not null,
  amount numeric not null,
  status text not null default 'pending',
  paid_date date, paid_amount numeric default 0, payment_method text, notes text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  currency text default 'BRL', description text, payment_type text,
  finance_transaction_id uuid,
  constraint student_payments_tenant_month_type_key unique (tenant_id, month_year, payment_type)
);

create table public.checkin_inspections (
  id uuid not null default gen_random_uuid() primary key,
  rental_id uuid not null unique references public.apartment_rentals(id) on delete cascade,
  current_stage public.checkin_stage not null default 'contracted',
  inspection_contracted boolean not null default false,
  inspection_scheduled_date date, inspection_completed_at date, inspection_pdf_url text,
  inspection_cost numeric(10,2),
  delivered_at date,
  delivered_to_tenant_id uuid references public.rental_tenants(id) on delete set null,
  signed_at date, signed_pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  inspection_scheduled_time time
);

alter table public.finance_counterparties enable row level security;
alter table public.apartments enable row level security;
alter table public.apartment_rentals enable row level security;
alter table public.rental_tenants enable row level security;
alter table public.apartment_departures enable row level security;
alter table public.rental_contracts enable row level security;
alter table public.cleaning_records enable row level security;
alter table public.security_deposits enable row level security;
alter table public.security_deposit_deductions enable row level security;
alter table public.student_payments enable row level security;
alter table public.checkin_inspections enable row level security;

insert into storage.buckets (id, name, public) values
  ('rental-contracts', 'rental-contracts', false),
  ('checkin-documents', 'checkin-documents', false)
on conflict (id) do nothing;
