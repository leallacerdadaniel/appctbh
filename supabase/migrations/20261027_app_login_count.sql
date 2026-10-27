-- App CTBH: quantas vezes o aluno já fez login no app (coluna "Logins" do admin).
-- Só acréscimo na tabela do app (app_students). Nenhuma tabela do site é alterada.

alter table public.app_students add column if not exists login_count integer not null default 0;

-- app_touch(true) é chamado pelo app a cada login: soma 1 na contagem.
create or replace function public.app_touch(p_login boolean default false)
returns void
language sql security definer set search_path = public
as $$
  update public.app_students
     set last_seen_at = now(),
         last_login_at = case when p_login then now() else last_login_at end,
         login_count = login_count + case when p_login then 1 else 0 end,
         updated_at = now()
   where auth_user_id = auth.uid() and status = 'active'
$$;
