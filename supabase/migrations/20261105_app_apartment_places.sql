-- Lugares e distâncias por apartamento, calculados por scripts/apartment_places.py.
-- nearby: lista "À proximité" e tempo até a SKEMA. times: tempo até cada lugar curado, por placeId.
create table if not exists public.app_apartment_places (
  apartment_id uuid primary key references public.apartments(id) on delete cascade,
  nearby jsonb not null,
  times jsonb not null,
  computed_at timestamptz not null default now()
);

alter table public.app_apartment_places enable row level security;
