---
name: ctbh-design-system
description: Visual design rules for the Chez Toi BH student app (Expo, light mode, DUO Gourmet-inspired: red brand bar, gray canvas, white photo cards). Use whenever creating or changing any screen, component, style, color, icon, spacing or animation in this app, including requests like "cria uma tela", "nova seção", "muda o layout", "ajusta o visual", "deixa mais bonito", "add a component". Do not use for backend, data scripts or Supabase work.
metadata:
  author: Chez Toi BH
  version: 2.1.0
---

# CTBH Design System

## Contexto

The owner rejected two earlier versions (v1 "pesado, ícones genéricos"; v2 all-white without the brand red) and chose the **DUO Gourmet app** as the main inspiration (screenshots and analysis in [references/duo.md](references/duo.md)). This skill turns that into rules so every screen reads as one product.

Direction in one sentence (v3, owner 2026-11-08: "mix do Airbnb com o Revolut, focado 100% na experiência do aluno"): **a cool gray canvas, white cards with large radius, bold Plus Jakarta Sans titles, icons in tinted circles, photos as the content, brand red for the main action; the red bar with the logo stays on pushed screens.** Approved mockups: https://claude.ai/artifact/F8BRwXetJgskUp4xuh6nLj (page "Experiência do aluno (v2)").

## Etapa 1: Use the tokens, never raw values

All values live in `src/constants/theme.ts`; full table in [references/tokens.md](references/tokens.md).

- Light mode only. `useTheme()` always returns the light palette.
- `canvas` (light gray) behind everything, `surface` (white) for cards, `brand` red for the top bar and accents.
- Type scale (5 sizes): `display` 28, `title` 19, `body` 15, `callout` 13, `caption` 12. Plus Jakarta Sans 700 for display/title only; Inter 400 for text, Inter 500 for list titles, Inter 600 (`Fonts.bodySemi`) for names, row titles in v3 cards, pills and numbers. Never bold paragraphs.
- Spacing multiples of 4, gutter 20, 32 between sections. Card radius 20 (`Radius.lg`), 24 for big cards (`Radius.xl`), `Shadow.card`; `Shadow.raised` for the address card and the Explorer search.

## Etapa 2: Build with the shared components

Read [references/components.md](references/components.md). In order of preference:

1. `Screen` — pushed screens pass `back`: red `BrandBar` with the logo and the back arrow. Tab screens: light canvas with the `TabHeader` row (initials → profile, "Une question ? Demandez" → assistant, bell); `bar="none"` when the tab draws its own top (Explorer's search), `onPhoto` when it starts with a full-bleed photo (arrival Home). `FocusStatusBar` keeps the status bar dark on tabs and white on the red bar.
   v3 pieces live in `src/components/home-v3.tsx` (`AddressCard`, `QuickActions`, `TonightCarousel`, `TintCard`/`TintRow`, `RowPill`, `WelcomeHero`) and `tab-bar.tsx`.
2. `Section` — title, optional one-line subtitle, optional "Voir plus ›".
3. `PhotoCard` (carousel item), `PlaceRow` (list row with square photo), `HeroCard` (suggestion of the week), `CategoryCircle` (emoji in a white circle).
4. `Card` + `ListGroup`/`ListRow` for lists of facts and settings (white card on the canvas).
5. `Icon` for UI icons (never import an icon library directly); emoji only inside `CategoryCircle`, `HubTile` and `ChoreBadge`.

New patterns go in `src/components/` and get documented in `references/components.md` in the same change.

## Etapa 3: Verify

Go through the Regras, then run the `ctbh-design-review` skill (static check + screenshots at 390 px).

## Exemplos

**Tabs (v3, owner 2026-11-08):** Accueil · Explorer · [Assistant, red button in the middle, not a tab] · Maison · Séjour. The Agenda is a page (`/calendar`) opened from Accueil. Explorer = search that also asks the AI + Airbnb-like categories (Pour vous, Sortir, Manger, Sport, Culture, Voyages, Pratique) reusing the Guide and Explorer content.

**Home v3:** around the arrival (7 days before to 14 after): neighborhood/apartment photo with the TabHeader on it, "Bienvenue chez toi" and the 5-step "Pour bien démarrer" list (Wi‑Fi, address, apps, roommates, rules; kept on the phone; "Masquer"). Every day: date + greeting → "Chez vous" address card (Uber, 99, Copier, Montrer) → quick actions (Wi‑Fi, Services, Colocs, SOS) → "Ce soir à BH" photo carousel → "Cette semaine" (rent only from 3 days before the 5th or when late, my chores with "C’est fait", cleaning, open requests, holidays). The rent is never the first thing on the screen.

**Restaurant list row:** white card, 88 px square photo with a dark rating pill, bold name, "Italienne • $$$" with unused $ dimmed, "Lourdes • 9 min à pied".

## Regras

- **Brand bar on pushed screens**: red, white logo centered, white back arrow, white status bar text. Tab screens use the `TabHeader` on the light canvas instead (v3); SOS is a quick action on Accueil and stays in Explorer › Pratique.
- **Canvas + cards**: content sits in white cards (radius 20, `Shadow.card`) on the gray canvas. No borders on cards; hairlines only inside a card. List icons sit in a tinted circle (`ListRow`, `TintRow`): `brandSoft`/`infoSoft`/`successSoft`/`warningSoft`/`fill`.
- **Photos first**: places, restaurants and the apartment are shown with a photo whenever one exists; the rating sits on the photo in a dark pill.
- **Sections explain themselves**: title + one-line subtitle; "Voir plus ›" when there is a full list.
- **Red accents**: brand bar, primary button, active tab, list-row icons, back arrow, small accents (selected filter), the round profile button on Home (red circle, white person icon). Errors never use brand red: `error` + icon + text.
- **Categories, hub tiles and chores** use emoji (`CategoryCircle`, `HubTile`, `ChoreBadge`: the chore's emoji chosen by the roommates, in a small `fill` circle); UI controls use `Icon`. No emoji anywhere else.
- **Hub + sub-pages, not long pages**: a tab screen shows what is used daily plus `HubTile`s or `ListRow`s (with a live status line) leading to sub-pages (`src/app/<topic>/…`, `Screen back`), grouped in `Section`s by task or frequency. Never stack every topic on one page, never show the same entry twice on one tab.
- **Loading and errors are never blank**: `LoadingState` while data loads, `RetryCard` (what failed + "Réessayer") when it fails. Never "Bientôt disponible" for something that exists but didn't load.
- **Pull to refresh** on every screen that shows live data (`Screen onRefresh`).
- **No uppercase titles**, sentence case everywhere.
- **Screens appear whole**: no staggered entrance animations; icons never pop in (Material font preloaded in `src/app/_layout.tsx`). Images reserve their space while loading.
- **Tab bar** (`TabBar`, own component): white, full width, hairline on top, active tab red with the filled icon, the raised red Assistant button in the middle (opens `/assistant`).
- **The app is about the student's home**, not restaurants: DUO is a restaurant app, so take its *patterns*, not its content balance. Restaurants are one section among others, never the top of Home.
- **Never truncate text** (owner, 2026-10-16): no `numberOfLines` / "…" on information — let it wrap; cards in a row stretch to the same height. Only exception: the tab bar labels. Strings never end with "…" either.
- **Every string in FR and EN** via `src/i18n/strings.ts`. Tap targets ≥ 44 pt (small pills such as `Chip`, `SegmentedControl` and SOS reach it with `hitSlop`).
- **No dead buttons**: no row or button that only says "Bientôt"; hide it until it works (leave a TODO in the code).

## Common Issues

### It looks heavy again
Cause: too many cards inside cards or too many colors. Solution: one card level on the canvas, red only in the listed places, photos instead of extra decoration.

### The photo box jumps when the image arrives
Cause: image without a fixed size. Solution: `PlacePhoto` / fixed `aspectRatio` with the `fill` placeholder.

## Atualizações Progressivas

When the owner approves or rejects a visual decision, add one line here with the date and the rule, and update the references if a value changed.

- 2026-10-16: v1 rejected as "pesado, ícones genéricos, sem cuidado". Light mode only.
- 2026-10-16: v2 (all white, red only on button/tab) rejected: "tem que ter o vermelho habitual e a logo". Red + logo always present.
- 2026-10-16: "muito travado, as coisas começam sem juntar os elementos": no staggered entrances, no per-icon font loading. Never reintroduce either.
- 2026-10-16 (2nd time, same words): went further — Outfit 400 for titles, display 24, title 17, callout 13, list rows regular. Default to lighter whenever in doubt.
- 2026-10-16: "estou achando as fontes grandes e grossas… quero deixar mais clean": scale reduced (32→26, 20→18, 16→15, 15→14, 13→12) and max weight 500 (semibold/bold removed).
- 2026-10-16: BH tourist attractions added: the "Voyages" tab became "Explorer" with a segmented control BH · Minas · Brésil (owner chose this over a 6th tab).
- 2026-10-16: "tem coisas truncadas… aparecendo ...": removed every truncation (26) and the "…" in strings.
- 2026-10-16: new "Voyages" tab (22 researched destinations, Google photos with a chosen `photoIndex`). It replaced the Profil tab; the profile opens from the initials next to the Home greeting.
- 2026-10-16: "não gostaria que tivesse tudo na mesma página": Mon appart became a hub (photo, address, Wi‑Fi, tiles) with sub-pages for cleaning, contract and roommates.
- 2026-10-16: "não gostei que na barra superior tem o bairro, deixar apenas a logo": brand bar shows only the logo (+ back arrow on pushed screens).
- 2026-10-16: "achei que focou muito em restaurante": Home now opens on the apartment, restaurants moved to the end. Tab bar labels were clipped → custom `FloatingTabBar`.
- 2026-10-16: owner chose DUO Gourmet as the main reference (references/duo.md). Gray canvas + white cards with soft shadow, red brand bar on every screen, photo cards and carousels, emoji category circles, floating tab bar. Supersedes the "no boxes / no shadows" rules of v2.
- 2026-10-28: Home reorganised: "Cette semaine" became "À venir" (next dates from the calendar), roommates and the search pill removed, "Explorer" invitation card at the end. A checklist of first steps and a weekly outing idea were tried and rejected ("não gostei"). The profile entry as a white pill with the word "Profil" was rejected ("muito grande, truncando as frases"): it is now a compact red circle with a person icon (the owner adds the drawing).
- 2026-10-28: shared expenses redesigned after "achei ela muito básica": balance card with roommates' avatars, activity grouped by month with date blocks and what each expense means for the student ("vous avez prêté" in green / "vous devez"), avatar pickers, large calculator-style amount with an R$ / € switch. No category emoji (owner's choice).
- 2026-11-04: birthday card (`birthday-greeting.tsx`) may use brand red: red band with small dots, round white badge with the cake, the name large. Owner asked for it to look nicer; it shows once a year, so it is the one festive exception.
- 2026-11-08: the notifications bell joined the brand bar on the right of tab screens (SOS left, bell right; pushed screens: back arrow only). Chores show their emoji in a `ChoreBadge`; the assistant is a chat (student bubble `fill` on the right, assistant bubble white card on the left, dark round send button, no brand red).
- 2026-11-08: owner approved the "structure by task" navigation (stage 1): tabs Accueil · Maison · Chez Toi · Agenda · BH. Home keeps only what needs action now; "Mon appart" became Maison (apartment + roommates + cleaning); the new Chez Toi tab gathers requests, payments, contract and help; Guide and Explorer share the BH tab under a segmented control (full fusion is stage 2). The brand bar now carries **SOS on the left of tab screens**, superseding the 2026-10-16 "only the logo" rule for tab screens (pushed screens keep the back arrow, no SOS).
- 2026-11-08 (night): owner rejected three French-style mockups ("ficou tudo feio"), liked the super-app style but not the layout ("vamos dar ênfase logo no preço?"), and approved v3: "mix do Airbnb com o Revolut", built around what the student uses most (Wi‑Fi on arrival, the address for Uber, apps to install, what to do, the AI). New tabs Accueil · Explorer · Assistant (center) · Maison · Séjour; Plus Jakarta Sans bold titles; tinted icon circles; rent hidden until 3 days before it is due. The arrival checklist rejected on 2026-10-28 comes back only around the arrival, as part of the approved v3 mockups.
- 2026-11-08 (late): the assistant is **Charlotte**, with the mascot face (red brand character with a black beret, option B on the canvas): `CharlotteFace` in `src/components/charlotte.tsx`, used as the raised button in the middle of the tab bar (on white), in the TabHeader pill ("Demandez à Charlotte"), in Explorer's search and next to each of her answers in the chat. The cleaner of each apartment shows in a `CleanerCard` (name, WhatsApp prefilled in Portuguese, call, link to the apartment phrases). "Parler portugais" (`src/app/portuguese/`, `portuguese-ui.tsx`) sits in Explorer: phrase of the day in Pour vous, entry in Pratique.
- 2026-11-09: "da uma estilizada nesse header, plain assim tá feio": the red bar of pushed screens got rounded bottom corners (24) and a soft red shadow, floats over the screen (`BrandBar overlay`, used by `Screen back`) so the content scrolls under the curve, and the back arrow sits in a 36 pt `onBrandTrack` circle (same family as the SOS pill). Logo stays centered, nothing else in the bar.
- 2026-11-09: "adiciona um pouco de tom escuro nessa barra, tipo um gradiente": the brand bar is a diagonal gradient `Brand.barGradient` (#EE1427 → #D20B1E → #8E0614, top-left to bottom-right) with a faint white light at the top, and a deeper wine shadow. Solid `brand` red stays the color for buttons, active tab and accents.
- 2026-11-09: login redesigned twice the same day ("tá feio demais", then "não sei se é legal a Charlotte na entrada"): no Charlotte. Full-bleed team photo of BH from the Serra do Curral, natural colors at the top (light dark shade for the logo), the brand red turning to wine (`Brand.barGradient[2]`) behind a 38 pt white "Bienvenue chez toi" left-aligned; logo top-left, language switch top-right; the form in a white sheet (top radius 32) overlapping the photo.
- 2026-11-09: "essa parte branca poderia ser mais bonitinha": sign-in sheets use `src/components/auth-ui.tsx`: `AuthField` (icon inside a 56 pt pill, red ring and white fill when focused, eye on passwords, small red link in the label row), `GradientButton` (brand gradient pill with an arrow), `AuthDivider` ("ou") and `OutlineButton` (the "Premier accès" way in). The same backdrop and sheet carry the first-access steps, with step dots in the hero.
