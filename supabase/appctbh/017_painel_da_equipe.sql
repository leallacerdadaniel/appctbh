-- appctbh: o que faltava para as telas do painel (09/11/2026) lerem e mexerem nas tabelas do app que já
-- existiam: fila de pedidos (onda 6), faxineira de cada apartamento (011) e fotos dos chamados.
-- Encomendas, links da agenda, avisos e faxineiras já tinham política (008, 011, 012, 013).
-- No site, aplicar junto com as tabelas de cada onda, quando o app for para produção.

-- Fila de pedidos: a equipe lê tudo e muda só o andamento, o recado, a taxa e a data.
-- A linha do tempo (app_request_events) é escrita pelo gatilho app_requests_log, não pelo painel.
create policy "Equipe le pedidos" on public.app_requests for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe atende pedidos" on public.app_requests for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe le linha do tempo dos pedidos" on public.app_request_events for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
grant select on public.app_requests, public.app_request_events to authenticated;
grant update (status, team_note, fee_cents, billing_month, scheduled_date, start_time, end_time) on public.app_requests to authenticated;

-- Fotos dos chamados de manutenção (bucket privado): a equipe abre por link temporário.
create policy "Equipe ve fotos dos chamados" on storage.objects for select to authenticated
  using (bucket_id = 'app-request-photos'
         and (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe')));

-- Ficha do apartamento no app: a equipe lê e escolhe a faxineira (o resto da ficha fica para a onda 4).
create policy "Equipe le ficha do apartamento" on public.app_apartment_info for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
create policy "Equipe escolhe a faxineira" on public.app_apartment_info for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
grant select on public.app_apartment_info to authenticated;
grant update (cleaner_id, updated_by, updated_at) on public.app_apartment_info to authenticated;

-- Apartamento que ainda não tem ficha no app: a equipe cria a linha ao escolher a faxineira.
create policy "Equipe cria ficha do apartamento" on public.app_apartment_info for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
grant insert (apartment_id, cleaner_id, updated_by, updated_at) on public.app_apartment_info to authenticated;

-- Quantos alunos leram cada aviso (tela de avisos do painel).
create policy "Equipe ve quem leu os avisos" on public.app_notice_reads for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));
grant select on public.app_notice_reads to authenticated;
