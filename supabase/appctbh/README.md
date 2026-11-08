# appctbh: o banco de desenvolvimento do app

Projeto Supabase `appctbh` (`gxhvhacqemdwwebsftcd`), criado em 08/11/2026 na organização Chez Toi BH.
Serve para desenvolver e testar sem tocar no banco do site (`miucfiiporxhvvbefonh`).

| Arquivo | O que faz |
|---|---|
| `001_estrutura_do_site.sql` | As 11 tabelas do site que a `app-api` lê, só a estrutura, copiada do catálogo do site |
| `002_tabelas_e_funcoes_do_app.sql` | Tabelas `app_*` e funções `app_*`, copiadas do que está no ar em 08/11/2026 |
| `003_dados_de_teste.sql` | Apartamento, três alunos, faxinas, pagamentos e caução fictícios; trocar `:hash` pelo hash da senha de teste |

A função `supabase/functions/app-api/index.ts` está publicada no `appctbh` com o nome `app-api`
(Verify JWT desligado, porque o app usa token próprio). O endereço vai no `.env.local`.

Regra: tabela ou função nova nasce aqui; só vai para o banco do site depois de testada e aprovada,
só acrescentando, com backup antes.
