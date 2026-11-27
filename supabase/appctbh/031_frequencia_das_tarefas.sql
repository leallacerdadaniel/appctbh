-- 007 (produção) / 031 (appctbh): frequência das tarefas da casa (27/11/2026, pedido do Daniel: "na hora de lançar as
-- tasks, verificar a periodicidade que eles querem pôr"). daily = uma pessoa por semana, todos os dias; weekly = uma vez
-- por semana (como era); biweekly = a cada 2 semanas; monthly = a cada 4 semanas. O rodízio anda a cada vez que a
-- tarefa acontece (a app-house calcula a partir de start_week). As tarefas que já existem ficam semanais.

alter table public.app_chores add column if not exists frequency text not null default 'weekly';
alter table public.app_chores drop constraint if exists app_chores_frequency_check;
alter table public.app_chores add constraint app_chores_frequency_check
  check (frequency in ('daily', 'weekly', 'biweekly', 'monthly'));
