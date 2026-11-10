-- appctbh: a equipe marca como vista a resposta da Charlotte que o aluno sinalizou (10/11/2026).
-- Tela "Respostas da Charlotte" do painel (branch app/painel-do-app do site). A leitura já veio na 021
-- (política de SELECT e grant); aqui entra só marcar como vista: handled_at e handled_by, por admin e equipe.
-- "Signaler cette réponse" é exigência do Google Play para conteúdo gerado por IA: sem a tela, o aviso do
-- aluno não chegava a ninguém.

drop policy if exists "Equipe resolve respostas marcadas da Charlotte" on public.app_assistant_reports;
create policy "Equipe resolve respostas marcadas da Charlotte" on public.app_assistant_reports for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'equipe'));

grant update (handled_at, handled_by) on public.app_assistant_reports to authenticated;
