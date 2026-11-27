-- 003 (produção) / 026 (appctbh): o painel do app junto com o site (27/11/2026, aprovado pelo Daniel:
-- "unificar o máximo de coisas possível ... na hora de gerenciar o app, aquela aba do painel tem que vir com tudo").
-- Só permissões, uma coluna e um gatilho. Nenhum dado muda. Roda igual nos dois projetos (no appctbh não existe
-- rental_incidents: a parte C pula a ligação com Ocorrências).
--
-- A. Faxinas: a equipe lê as notas que os alunos dão às faxinas pelo app (aparecem na tela Faxinas do site).
-- B. Informações do apto no app (Wi-Fi, número, lixo, portaria, espaço gourmet): a equipe passa a gravar pelo painel,
--    e sobe as fotos do lixo no bucket público app-apartment-files (só JPEG, o painel converte).
-- C. Chamado de manutenção do app ligado a uma ocorrência do site (app_requests.incident_id). Resolver a ocorrência
--    conclui o chamado: o gatilho de app_requests registra na linha do tempo e avisa o aluno pelo sino.
-- D. Pix, dados bancários e a janela de acesso do app: só o papel admin lê e grava.

begin;

-- ---------- A ----------
drop policy if exists "Equipe le notas das faxinas" on public.app_cleaning_feedback;
create policy "Equipe le notas das faxinas" on public.app_cleaning_feedback for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role) or public.has_role(auth.uid(), 'equipe'::public.app_role));
grant select on public.app_cleaning_feedback to authenticated;

-- ---------- B ----------
-- house_rules e student_notes ficam de fora: o app não usa.
drop policy if exists "Equipe escolhe a faxineira" on public.app_apartment_info;
drop policy if exists "Equipe edita ficha do apartamento" on public.app_apartment_info;
create policy "Equipe edita ficha do apartamento" on public.app_apartment_info for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role) or public.has_role(auth.uid(), 'equipe'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role) or public.has_role(auth.uid(), 'equipe'::public.app_role));
grant insert (apartment_id, wifi_name, wifi_password, unit_number, trash_info, building_info, cleaner_id, updated_by, updated_at)
  on public.app_apartment_info to authenticated;
grant update (wifi_name, wifi_password, unit_number, trash_info, building_info, cleaner_id, updated_by, updated_at)
  on public.app_apartment_info to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('app-apartment-files', 'app-apartment-files', true, 5000000, array['image/jpeg'])
on conflict (id) do nothing;
drop policy if exists "Equipe envia fotos do apartamento" on storage.objects;
create policy "Equipe envia fotos do apartamento" on storage.objects for insert to authenticated
  with check (bucket_id = 'app-apartment-files'
              and (public.has_role(auth.uid(), 'admin'::public.app_role) or public.has_role(auth.uid(), 'equipe'::public.app_role)));
drop policy if exists "Equipe apaga fotos do apartamento" on storage.objects;
create policy "Equipe apaga fotos do apartamento" on storage.objects for delete to authenticated
  using (bucket_id = 'app-apartment-files'
         and (public.has_role(auth.uid(), 'admin'::public.app_role) or public.has_role(auth.uid(), 'equipe'::public.app_role)));

-- ---------- C ----------
alter table public.app_requests add column if not exists incident_id uuid;
create unique index if not exists app_requests_incident_idx on public.app_requests (incident_id) where incident_id is not null;
grant select (incident_id), update (incident_id) on public.app_requests to authenticated;

do $c$
begin
  if to_regclass('public.rental_incidents') is null then
    raise notice 'sem rental_incidents (appctbh): só a coluna';
    return;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'app_requests_incident_fk') then
    alter table public.app_requests
      add constraint app_requests_incident_fk foreign key (incident_id) references public.rental_incidents(id) on delete set null;
  end if;

  -- Ocorrência resolvida (em qualquer tela do site) → o chamado ligado a ela fica Concluído.
  create or replace function public.app_incident_resolved()
  returns trigger language plpgsql security definer set search_path to '' as $f$
  begin
    if new.resolved and not coalesce(old.resolved, false) then
      update public.app_requests
      set status = 'done'
      where incident_id = new.id and status in ('received', 'scheduled', 'in_progress');
    end if;
    return null;
  end;
  $f$;
  revoke all on function public.app_incident_resolved() from public, anon, authenticated;

  drop trigger if exists app_incident_resolved on public.rental_incidents;
  create trigger app_incident_resolved after update of resolved on public.rental_incidents
    for each row execute function public.app_incident_resolved();
end;
$c$;

-- ---------- D ----------
-- app_payment_info já tem a regra "só admin" (008); faltava o grant, tirado na 021.
grant select, update on public.app_payment_info to authenticated;

drop policy if exists "Admin le e edita a janela do app" on public.app_settings;
create policy "Admin le e edita a janela do app" on public.app_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));
grant select, update on public.app_settings to authenticated;

commit;
