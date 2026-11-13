# appctbh: o banco de desenvolvimento do app

Projeto Supabase `appctbh` (`gxhvhacqemdwwebsftcd`), criado em 08/11/2026 na organização Chez Toi BH.
Serve para desenvolver e testar sem tocar no banco do site (`miucfiiporxhvvbefonh`).

| Arquivo | O que faz |
|---|---|
| `001_estrutura_do_site.sql` | As 11 tabelas do site que a `app-api` lê, só a estrutura, copiada do catálogo do site |
| `002_tabelas_e_funcoes_do_app.sql` | Tabelas `app_*` e funções `app_*`, copiadas do que está no ar em 08/11/2026 |
| `003_dados_de_teste.sql` | Apartamento, três alunos, faxinas, pagamentos e caução fictícios; trocar `:hash` pelo hash da senha de teste |
| `004_pedidos.sql` / `005_dados_de_teste_pedidos.sql` | Catálogo de extras, pedidos, linha do tempo e fotos (onda 6) |
| `006_papeis_e_catalogo_no_painel.sql` | Papéis da equipe (cópia de `has_role`) e acesso do painel ao catálogo |
| `007_assistente.sql` | Uso da Charlotte (tokens por aluno, limite diário) |
| `008_casa_avisos_pagamento.sql` / `009_dados_de_teste_casa.sql` | Tarefas da casa, avisos (sino), como pagar, aparelhos para push |
| `010_regras_aceitas.sql` | Aceite das regras da casa (introdução obrigatória) |
| `011_faxineira_do_apartamento.sql` | Faxineira de cada apartamento; `app_home_for` devolve nome e telefone (se autorizado) |
| `012_visitas_encomendas_perfis.sql` | Visitas na portaria, encomendas (gatilho → aviso), perfis dos colegas |
| `013_agenda_bh.sql` | Agenda de BH: eventos, links colados pela equipe, robô diário (pg_cron 06:15) |
| `023_data_dos_avisos.sql` | Aviso de evento com a hora em cada língua (`app_notice_when`: fr « 19/11 à 19h00 », en « Nov 19, 7:00 PM »); só troca funções |
| `025_revisao_do_servidor.sql` | Revisão do servidor (10/11/2026): contrato só o 'tenant' em `app_home_for`; locação 'finished' vale até 30 dias depois do fim (`app_rental_for`, `app_access_until`, data de BH); aparelhos desligados quando a sessão cai (gatilho em `app_students`); push nunca derruba o aviso; `app_account_delete` guarda suspensão, bloqueios sofridos e histórico, avisa quem ia nas viagens e limpa avisos órfãos; cota da Charlotte ignora 'pending' velho; `app_has_link` com a regra nova (A a D, igual às funções e ao app); reserva do espaço gourmet atômica e por prédio (`app_gourmet_book`); sem SELECT do painel em `app_students` e `app_password_resets` |

As funções `app-api`, `app-requests`, `app-house`, `app-assistant`, `app-events` e `app-events-sync`
(`supabase/functions/`) estão publicadas no `appctbh` com Verify JWT desligado: o app usa token próprio e o
robô da agenda exige o segredo guardado no Vault. O endereço da `app-api` vai no `.env.local`.

Regra: tabela ou função nova nasce aqui; só vai para o banco do site depois de testada e aprovada,
só acrescentando, com backup antes.
