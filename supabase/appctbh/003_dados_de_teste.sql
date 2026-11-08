-- appctbh: dados de teste FICTÍCIOS (nenhum aluno real). Datas relativas ao dia em que roda:
-- semestre de 3 meses atrás até 3 meses à frente. Para refazer do zero, rode de novo:
-- o bloco apaga o que criou antes (ids fixos abaixo).
-- A senha da conta de teste não fica no Git: troque :hash pelo hash PBKDF2 gerado localmente
-- (o .env.local de quem gerou tem a senha).

do $$
declare
  ap uuid := '00000000-0000-4000-a000-000000000001';
  rt uuid := '00000000-0000-4000-a000-000000000010';
  lea uuid := '00000000-0000-4000-a000-000000000101';
  hugo uuid := '00000000-0000-4000-a000-000000000102';
  chloe uuid := '00000000-0000-4000-a000-000000000103';
  t_lea uuid := '00000000-0000-4000-a000-000000000201';
  t_hugo uuid := '00000000-0000-4000-a000-000000000202';
  t_chloe uuid := '00000000-0000-4000-a000-000000000203';
  dep uuid := '00000000-0000-4000-a000-000000000301';
  inicio date := (date_trunc('month', current_date) - interval '3 months')::date;
  fim date := (date_trunc('month', current_date) + interval '3 months' - interval '1 day')::date;
  d date;
  m date;
begin
  delete from public.apartments where id = ap;
  delete from public.finance_counterparties where id in (lea, hugo, chloe);

  insert into public.app_settings (id, access_start, access_end)
  values (true, inicio, fim)
  on conflict (id) do update set access_start = excluded.access_start, access_end = excluded.access_end, updated_at = now();

  insert into public.finance_counterparties (id, name, type, email, nationality, date_of_birth, arrival_date, departure_date) values
    (lea, 'Léa Martin', 'client', 'lea.teste@appctbh.test', 'Française', '2003-04-12', inicio, fim),
    (hugo, 'Hugo Bernard', 'client', 'hugo.teste@appctbh.test', 'Française', '2002-09-30', inicio, fim),
    (chloe, 'Chloé Dubois', 'client', 'chloe.teste@appctbh.test', 'Française', '2003-01-18', inicio, fim);

  insert into public.apartments (id, title, location, address_complement, price, bedrooms, bathrooms, slug, latitude, longitude, max_residents)
  values (ap, 'Apê de teste Savassi', 'Rua Antônio de Albuquerque, 335 - Funcionários. Belo Horizonte - MG', 'Apto 802',
          2400, 3, 2, 'teste-savassi', -19.93660000, -43.93460000, 3);

  insert into public.app_apartment_info (apartment_id, wifi_name, wifi_password, unit_number, trash_info)
  values (ap, 'ChezToi_Teste', 'bienvenue-teste', '802',
          jsonb_build_object(
            'fr', 'Sacs fermés au local du rez-de-chaussée. Recyclage le mardi et le vendredi.',
            'en', 'Closed bags in the ground-floor trash room. Recycling on Tuesdays and Fridays.'));

  insert into public.apartment_rentals (id, apartment_id, start_date, end_date, monthly_rent, status, nickname, semester,
                                        cleaning_day, cleaning_frequency, cleaning_time, contract_type)
  values (rt, ap, inicio, fim, 7200, 'active', 'Apto teste Savassi',
          extract(year from inicio)::int || '/' || case when extract(month from inicio) >= 7 then 2 else 1 end,
          'wednesday', 'weekly', '10:00', 'standard');

  insert into public.rental_tenants (id, rental_id, counterparty_id, individual_rent, move_in_date, move_out_date, arrival_confirmed_date, arrival_time) values
    (t_lea, rt, lea, 2400, inicio, fim, inicio, '14:00'),
    (t_hugo, rt, hugo, 2400, inicio, fim, inicio, '16:30'),
    (t_chloe, rt, chloe, 2400, inicio, fim, inicio + 2, '10:00');

  insert into public.app_students (counterparty_id, status, must_change_password, password_hash, display_name)
  values (lea, 'active', false, ':hash', 'Léa');
  insert into public.app_students (counterparty_id, status) values (hugo, 'no_access'), (chloe, 'no_access');

  -- Faxina toda quarta às 10h; as passadas ficam concluídas.
  d := inicio + ((3 - extract(dow from inicio)::int + 7) % 7);
  while d <= fim loop
    insert into public.cleaning_records (rental_id, scheduled_date, scheduled_time, completed, completed_at)
    values (rt, d, '10:00', d < current_date, case when d < current_date then (d + time '12:00') at time zone 'America/Sao_Paulo' end);
    d := d + 7;
  end loop;

  -- Aluguel mês a mês da Léa: pagos até o mês passado.
  m := inicio;
  while m <= fim loop
    insert into public.student_payments (tenant_id, rental_id, month_year, amount, status, paid_date, paid_amount)
    values (t_lea, rt, m, 2400, case when m < date_trunc('month', current_date) then 'paid' else 'pending' end,
            case when m < date_trunc('month', current_date) then m + 4 end,
            case when m < date_trunc('month', current_date) then 2400 else 0 end);
    m := (m + interval '1 month')::date;
  end loop;

  insert into public.security_deposits (id, tenant_id, rental_id, counterparty_id, amount, currency, status, semester)
  values (dep, t_lea, rt, lea, 2400, 'BRL', 'with_ctbh', extract(year from inicio)::int || '/2');

  insert into public.checkin_inspections (rental_id, current_stage, inspection_contracted, inspection_completed_at, delivered_at, delivered_to_tenant_id)
  values (rt, 'delivered', true, inicio - 2, inicio, t_lea);

  insert into public.apartment_departures (rental_id, tenant_id, contract_end_date, departure_date, checkout_datetime, semester)
  values (rt, lea, fim, fim, (fim + time '11:00') at time zone 'America/Sao_Paulo', extract(year from inicio)::int || '/2');

  insert into public.app_expenses (id, rental_id, description, amount_cents, paid_by, spent_on, split_mode, created_by)
  values ('00000000-0000-4000-a000-000000000401', rt, 'Supermercado Verdemar', 18690, hugo, current_date - 9, 'equal', hugo);
  insert into public.app_expense_shares (expense_id, counterparty_id, amount_cents) values
    ('00000000-0000-4000-a000-000000000401', lea, 6230),
    ('00000000-0000-4000-a000-000000000401', hugo, 6230),
    ('00000000-0000-4000-a000-000000000401', chloe, 6230);
end $$;
