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

Direction in one sentence: **the Chez Toi red bar with the logo on every screen, a light gray canvas, white rounded cards with soft shadows, photos as the content, friendly colorful categories.**

## Etapa 1: Use the tokens, never raw values

All values live in `src/constants/theme.ts`; full table in [references/tokens.md](references/tokens.md).

- Light mode only. `useTheme()` always returns the light palette.
- `canvas` (light gray) behind everything, `surface` (white) for cards, `brand` red for the top bar and accents.
- Type scale (5 sizes): `display` 24, `title` 17, `body` 15, `callout` 13, `caption` 12. Outfit 400 for display/title, Inter 400 for text and list rows, Inter 500 only for buttons, names and the active tab.
- Spacing multiples of 4, gutter 20, 32 between sections. Card radius 16, `Shadow.card` for cards.

## Etapa 2: Build with the shared components

Read [references/components.md](references/components.md). In order of preference:

1. `Screen` — always draws the red `BrandBar` (logo centered). Tab screens get the SOS button on its left and the notifications bell on its right; pushed screens pass `back` to get the back arrow on the left instead (and no bell).
2. `Section` — title, optional one-line subtitle, optional "Voir plus ›".
3. `PhotoCard` (carousel item), `PlaceRow` (list row with square photo), `HeroCard` (suggestion of the week), `CategoryCircle` (emoji in a white circle).
4. `Card` + `ListGroup`/`ListRow` for lists of facts and settings (white card on the canvas).
5. `Icon` for UI icons (never import an icon library directly); emoji only inside `CategoryCircle`, `HubTile` and `ChoreBadge`.

New patterns go in `src/components/` and get documented in `references/components.md` in the same change.

## Etapa 3: Verify

Go through the Regras, then run the `ctbh-design-review` skill (static check + screenshots at 390 px).

## Exemplos

**Tabs (structure by task, owner 2026-11-08):** Accueil (what needs action now) · Maison (the apartment and the roommates) · Chez Toi (ask, pay, sign) · Agenda · BH (Guide · Explorer). Each tab groups its content in `Section`s by task or frequency; the map with routes is in [references/components.md](references/components.md) ("Tabs").

**Home (only what needs action now):** red bar (SOS left, logo, bell right) → greeting + address + round red profile button → apartment hero ("Votre logement") → action rows that appear only when relevant (rent due, cleaning today or tomorrow, my chore this week, open requests) → "À venir" (3 next dates, "Voir l’agenda ›"; no cleaning row twice) → "Raccourcis" card (Wi‑Fi, WhatsApp) → "Explorer" invitation card last. No shared expenses (Maison), no emergency row (SOS in the bar), no category circles (BH › Guide), no search pill.

**Restaurant list row:** white card, 88 px square photo with a dark rating pill, bold name, "Italienne • $$$" with unused $ dimmed, "Lourdes • 9 min à pied".

## Regras

- **Brand bar on every screen**: red, white logo centered, no neighborhood or city. Left side: the **SOS button** on tab screens (white icon + "SOS" on a `onBrandTrack` pill, 44 pt touch area, opens `/emergency`), the white back arrow on pushed screens (never both). Right side: the **notifications bell** on tab screens only (white `bell` icon, 44 pt, unread count in a white badge with red digits, "9+" above 9, opens `/notices`); pushed screens leave it empty. Status bar text is white.
- **Canvas + cards**: content sits in white `Card`s (radius 16, `Shadow.card`) on the gray canvas. No borders on cards; hairlines only inside a card.
- **Photos first**: places, restaurants and the apartment are shown with a photo whenever one exists; the rating sits on the photo in a dark pill.
- **Sections explain themselves**: title + one-line subtitle; "Voir plus ›" when there is a full list.
- **Red accents**: brand bar, primary button, active tab, list-row icons, back arrow, small accents (selected filter), the round profile button on Home (red circle, white person icon). Errors never use brand red: `error` + icon + text.
- **Categories, hub tiles and chores** use emoji (`CategoryCircle`, `HubTile`, `ChoreBadge`: the chore's emoji chosen by the roommates, in a small `fill` circle); UI controls use `Icon`. No emoji anywhere else.
- **Hub + sub-pages, not long pages**: a tab screen shows what is used daily plus `HubTile`s or `ListRow`s (with a live status line) leading to sub-pages (`src/app/<topic>/…`, `Screen back`), grouped in `Section`s by task or frequency. Never stack every topic on one page, never show the same entry twice on one tab.
- **Loading and errors are never blank**: `LoadingState` while data loads, `RetryCard` (what failed + "Réessayer") when it fails. Never "Bientôt disponible" for something that exists but didn't load.
- **Pull to refresh** on every screen that shows live data (`Screen onRefresh`).
- **No uppercase titles**, sentence case everywhere.
- **Screens appear whole**: no staggered entrance animations; icons never pop in (Material font preloaded in `src/app/_layout.tsx`). Images reserve their space while loading.
- **Floating tab bar**: `FloatingTabBar` (own component — the default bar clipped the labels inside the pill): white pill, soft shadow, active tab red on a `fill` pill.
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
