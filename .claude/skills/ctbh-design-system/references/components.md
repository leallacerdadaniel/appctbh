# Components — Chez Toi BH app

All in `src/components/`. Use these before writing custom styles. Visual reference: `duo.md`.

## Tabs (structure by task, owner 2026-11-08)
Order and routes in `src/app/(tabs)/_layout.tsx`; icons in `FloatingTabBar`'s `ICONS`.
- **Accueil** `index.tsx` (`home`): greeting + profile button, apartment hero → `/maison`, action rows only when relevant (rent due → `/apartment/payments`, cleaning today/tomorrow → `/apartment/cleaning`, open requests → `/requests`), "À venir" (3 max → `/calendar`), Raccourcis (Wi‑Fi copy, WhatsApp), Explorer card → `/bh?section=explorer`.
- **Maison** `maison.tsx` (`apartment`): "Au quotidien" (unit, address maps/copy, Wi‑Fi, tiles → `/apartment/trash`, `/apartment/rules`), "Entre colocataires" (only with roommates: → `/expenses`, `/apartment/roommates`; chores later), "Ménage" (→ `/apartment/cleaning`, rating tile → `/apartment/feedback?id=` while a visit can be rated).
- **Chez Toi** `chez-toi.tsx` (`receipt`): "Demander" (→ `/requests/new`, `/requests/maintenance`; up to 3 open requests with `StatusPill` + → `/requests`), "Payer" (rent, extras on the next rents from `upcomingCharges`, deposit → `/apartment/payments`), "Mon contrat" (→ `/apartment/contract`, `/apartment/checkin`, `/apartment/checkout`; other documents later), "Aide" (WhatsApp; Assistant later).
- **Agenda** `calendar.tsx` (`calendar`): route name stays `calendar`.
- **BH** `bh.tsx` (`map`): `SegmentedControl` Guide · Explorer, kept in the route param `section` (`/bh?section=guide|explorer`, default guide). Bodies in `guide-content.tsx` (category circles on top, then search and hubs; `q` / `focus` params passed on) and `explorer-content.tsx`. Detail routes (`/attraction/[id]`, `/travel/[id]`, `/festival/[id]`…) are unchanged.

## Screen (`screen.tsx`)
Every screen. Draws the red `BrandBar` on top, then a scrollable gray canvas with a centered 560 px column, 20 px gutter, 32 px between sections.
- `title` / `subtitle`: `display` title and secondary line under the bar.
- `back`: pushed screens — white back arrow in the bar.
- `header`: extra content right under the bar (Home greeting).
- `onRefresh`: pull-to-refresh; pass a function returning a promise (the spinner stays until it settles). On every screen with live data: Accueil, Maison, Chez Toi, payments, cleaning, expenses, "Mes demandes", a request's page. `useHomeState().refresh`, `useRequests().reload` and `useExpenses().reload` return promises and keep what is on screen when the refresh fails.
- No `back` = tab screen: the bar shows the SOS button.
- `Reveal` is kept for old call sites and renders immediately (screens appear whole).

## BrandBar (`brand-bar.tsx`)
Red bar with the white logo centered (`logo-wordmark-white.png`). Left: `back` → white back arrow (pushed screens); `sos` → SOS pill on tab screens (`Icon` "emergency" 16 + "SOS" callout medium, white on the `onBrandTrack` pill, 32 pt tall with `hitSlop` to 44 pt, opens `/emergency`; accessibility label "Urgences"). `Screen` passes `sos` whenever `back` is off. Right side empty, reserved for the notifications bell (wave 9). Status bar text white.

## Section (`screen.tsx`)
`<Section title subtitle? action? onAction?>` — `title` in Outfit 20, one-line `subtitle` in `textSecondary`, "Voir plus ›" on the right. Keeps header and content together.

## Card (`ui.tsx`)
White, radius 16, `Shadow.card`, padding 16, no border. One level only (never a card inside a card).

## ListGroup + ListRow (`list.tsx`)
Rows inside a `Card`. Hairline dividers inset to the text. `icon` leading in brand red, `value` on the right, chevron when `onPress`, `accessory` to replace the chevron.

## PhotoCard (`photo-card.tsx`)
Carousel item, 220 px wide: `PlacePhoto` 16:10 with `RatingPill` over it, bold name, cuisine, "neighborhood • walk time". Used in horizontal `Carousel`s.

## Carousel (`photo-card.tsx`)
Horizontal ScrollView that bleeds to the screen edges with the gutter as inner padding, 12 px between items.

## CategoryCircle (`category-circle.tsx`)
64 px white circle with `Shadow.card`, emoji 28 px, short label under it (one line). Opens `/nearby?category=…`. The only place emoji are allowed.

## RatingPill (`photo-card.tsx`)
Dark `scrim` pill with a yellow star and the rating, top-right over photos.

## PlacePhoto (`place-photo.tsx`)
`<PlacePhoto placeId aspectRatio credit? />` Google Maps photo loaded live through the `place-photo` function (never stored, Google terms). Keeps its size with the `fill` color while loading. Pass `credit` wherever the photo is shown large.

## FloatingTabBar (`floating-tab-bar.tsx`)
Passed as `tabBar` in `src/app/(tabs)/_layout.tsx`. White pill, `Shadow.floating`, 6 px padding; each tab = icon 22 + label 11/15 (one line: keep labels short, "Chez Toi" is the longest); active tab red on a `fill` pill, filled SF variant (`iosActive`). Screens keep 120 px bottom padding so nothing hides behind it. Icons per route in its `ICONS` map: `index` home, `maison` apartment, `chez-toi` receipt, `calendar` calendar, `bh` map.

## HeroCard (`hero-card.tsx`)
Generic: `photo={{ uri }}` or `photo={{ placeId }}` (Google, credit shown), `label`, `labelIcon`, `title`, `subtitle`, `cta`, `onPress`. Home uses it for the apartment.

## HubTile + HubGrid (`hub-tile.tsx`)
Entry to a sub-page in a 2-column grid: emoji, bold title, live status in `caption` (2 lines max), chevron. Example: Maison → Prochain ménage ("Mercredi 21 octobre · 10h00"). Keep titles short enough for one line. A lone tile fills the row.


## MustGoBadge (`must-go-badge.tsx`)
Gold medal (`Icon` "medal", `theme.gold`) + "Incontournable" / "Must go" in a white pill, top-left over photos and above the photo on detail pages. Only for places listed in `src/lib/must-go.ts` (chosen by the owner). Each Explorer segment opens with a "Les incontournables" carousel when its list is not empty.

## SegmentedControl (`segmented-control.tsx`)
`fill` pill track; the selected segment is a white pill with `Shadow.card` and medium text. Generic `options/value/onChange`; segments are 36 pt with a vertical `hitSlop` to 44 pt. Use it to switch views of the same tab (BH: Guide · Explorer; Explorer: BH · Minas · Brésil · Am. du Sud · Fêtes; Plats à goûter: Minas · Brésil); use `Chip`s for filters inside a view.

## Dishes (`src/app/restaurants/dishes.tsx`, data `src/lib/dishes.ts` + `src/data/dish-photos.json`)
Dish cards: Wikimedia Commons photo with "© author · licence" (link to the file page), name, description, a "Où goûter" box with pills linking to places already in the app (restaurants, attractions, travel). Dish photos never come from Google (Google photos show places, not dishes). Never use a wrong photo: leave a dish out until a correct free photo exists.

## HoursCard (`hours-card.tsx`)
Week of Google opening hours, Monday first, today in medium weight with "· Aujourd’hui", open/closed in the section subtitle. Hidden when there are no hours.

## Explorer segment (`src/components/explorer-content.tsx`, `src/app/attraction/[id].tsx`, `src/app/travel/[id].tsx`)
BH: one carousel per attraction group (data `src/lib/attractions.ts` + `src/data/attractions.json` from `scripts/attractions.py`). Minas / Brésil: trip chips + full-width 16:9 destination cards (data `src/lib/travel.ts`).

## Travel (`src/components/explorer-content.tsx`, `src/app/travel/[id].tsx`, data `src/lib/travel.ts`)
Trip-type chips, two photo carousels (Minas / Brazil) of 4:5 cards with a trip badge and "≈ 2 h" from BH; detail page = photo with credit, description, facts card, highlights, tip, map button. Photos use `photoIndex` when the first Google photo is weak (watermark, people, dark): check a contact sheet before choosing.

## DocumentCard (`document-card.tsx`)
PDF with open / download buttons (contract; inspection reports later).

## CleaningVisits + CleaningSupplies (`cleaning.tsx`)
Next visit + upcoming/done visits in one card; supplies table (student language + Portuguese) with "copy in Portuguese" and "supermarkets nearby".

## Icon (`icon.tsx`)
`<Icon name="wifi" size={20} color={theme.brand} />`. Semantic registry → SF Symbols (iOS) / Material Symbols (Android, web). New icon = SF name + Material name + `glyph` codepoint from `node_modules/expo-symbols/build/android/symbols.json`. Android/web draw from the preloaded `MaterialSymbols_300Light` font — never `SymbolView` there (it pops in).

## Button (`ui.tsx`)
`primary` red / `secondary` fill / `plain` text. One primary per screen.

## Chip (`ui.tsx`)
Filter pills: white with hairline border; selected = red fill, white label. 36 pt tall, vertical `hitSlop` to a 44 pt touch area (keep ≥ 8 pt between rows of chips).

## LoadingState + RetryCard (`ui.tsx`)
`<LoadingState label={t.common.loading} />`: a gray spinner with room around it, while a screen's data loads. `<RetryCard message retryLabel onRetry />`: what couldn't load + a secondary "Réessayer" button. Used by `RequestsGate`, a request's page, expenses, the contract.

## Avatar (`ui.tsx`)
`fill` circle with initials.

## Text (`ui.tsx`)
`AppText` with `variant` = display | title | body | callout | caption.

## Shared expenses (`expense-ui.tsx`)
- `DateBlock`: `fill` rounded square, day (title) over the short month (caption). Starts each activity row.
- `PersonPicker`: roommates as 48 px avatars with the first name underneath; selected = dark ring + small green check. Used for "who paid", "split between", "who pays / to whom". The student comes first as "Vous".
- `CurrencyToggle`: R$ / € pill switch (`fill` track, white selected pill, like `SegmentedControl`).
- `AmountField`: the currency switch over a large centered amount (Outfit 44), calculator-style, at the top of the expense and payment forms.
- Money amounts that are in the student's favour use `success` green; amounts they owe stay in `text` (never error red).

## Requests (`request-ui.tsx`, screens in `src/app/requests/`)
- `StatusPill`: caption pill, `fill` background; done = `success` on `successSoft`, in progress = `warning`, confirmed = `text`, the rest `textSecondary`. Never brand red.
- `Timeline`: newest step first, dot + rail; "Envoyée / Sent" for the student's first step, then date · time (Belo Horizonte) · "Chez Toi" or "Vous", and the team's note.
- `DateChips` (horizontal scroller that bleeds to the card's edges, "Aujourd’hui", "Demain", "Lun. 10 nov.") and `TimeChips` (wrapping) — both inside a `Card`.
- `Stepper`: − value + with 44 pt round `fill` buttons; sits in a `ListRow` accessory (quantity, people).
- `StarRating`: 5 × 44 pt stars, `star` yellow when chosen (like `RatingPill`).
- `Notice`: icon + callout on `fill`, only inside a card (on the canvas the `fill` barely shows); `warning` tone for urgent repairs.
- `RequestsGate`: `LoadingState` while the requests load, the screen once loaded, a `RetryCard` if the first load failed.
- `useOpenSentRequest()`: after a request is created, dismisses the request flow (form, catalog, list) and pushes "Mes demandes" + the new request, so Back lands on the list, never on the form.
- Catalog extras are `HubTile`s with the catalog's emoji, grouped by category with a small label; free requests are `ListRow`s.
- Forms: one `Card` per group of fields (`FieldLabel` + chips), inputs always inside a card, one primary button at the end; cancel is a secondary button that asks "Appuyez encore pour annuler" (no Alert).

## Common Issues
### "button cannot be a descendant of button" (web console)
Cause: a `ListRow` with `onPress` whose `accessory` contains another pressable. Solution: a row is either pressable OR has action buttons in its accessory, never both.
