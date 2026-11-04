# Mapa de conteúdo: do app para os posts

Fonte de verdade: `app/src/lib/*.ts` (textos `fr`/`en`) e `app/src/data/*.json` (dados do Google). Fotos em `app/assets/`.

| Tema de post | Arquivos | Fotos |
|---|---|---|
| Atrações de BH (17, em 4 grupos) | `lib/attractions.ts`, `data/attractions.json` | `assets/attractions/` |
| Incontournables (medalhas) | `lib/must-go.ts` | |
| Destinos Minas (10), Brasil (15), América do Sul (10) | `lib/travel.ts`, `data/travel-places.json` | `assets/destinations/` |
| Eventos e festas (7) | `lib/festivals.ts`, `data/festivals.json` | `assets/festivals/` |
| Pratos (18: 9 de Minas, 9 do Brasil) | `lib/dishes.ts` | `assets/dishes/` |
| Restaurantes (42: occasion 20, everyday 13, burger 9) | `lib/restaurants-content.ts`, `data/restaurants.json` (campo `tier`, `top100`, `walkMin`) | sem fotos no app (vêm do Google): usar fotos próprias |
| Noite (bares e clubes) | `lib/nightlife.ts`, `data/nightlife.json` | `assets/nightlife/` |
| Esportes e academias | `lib/sports.ts`, `data/sports.json` | `assets/sports/` |
| Lugares próximos (mercado, farmácia, padaria, academia, lavanderia, shopping, hospital) | `data/nearby-demo.json` | |
| Apps e serviços (Uber, 99, iFood, bancos, companhias aéreas, ônibus, aluguel de carro) | `lib/services.ts` | `assets/services/` |
| Calendário e feriados | `lib/holidays.ts` (nacionais, municipais de BH, facultativos; datas móveis calculadas pela Páscoa) | |
| Marca | | `assets/brand/` (logo-wordmark-white.png para fundo vermelho) |

## Cuidados

- Usar os campos em inglês (`en`). Não traduzir do francês.
- `nearby-demo.json` tem o endereço de referência em modo demo: avisar nos pontos a confirmar.
- `walkMin`, preços e horários são fotografias da data da pesquisa (restaurantes: 17/out/2026; destinos: 16/out/2026; eventos: 18/out/2026).
- Dados fictícios (faxinas, aluno, contrato em `mock-data.ts` e `cleaning.ts`) nunca entram em posts.
- Chalezinho (noite) está fechado para reforma: não incluir.
