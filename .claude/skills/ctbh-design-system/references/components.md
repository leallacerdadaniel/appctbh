# Components — Chez Toi BH app

All in `src/components/`. Use these before writing custom styles. Visual reference: `duo.md`.

## Tabs (v3, owner 2026-11-08: "mix do Airbnb com o Revolut")
Order and routes in `src/app/(tabs)/_layout.tsx`; icons in `TabBar`'s `ICONS` (`src/components/tab-bar.tsx`). The Assistant is the raised red button between Explorer and Maison (opens `/assistant`), not a route of the tabs.
- **Accueil** `index.tsx` (`home`): arrival mode (`useWelcome` in `src/lib/welcome.ts`, 7 days before to 14 after the arrival, `/?welcome=1` forces it): `WelcomeHero` (photo + TabHeader on it) and the 5-step list (Wi‑Fi copy, address copy, → `/first-steps`, → `/apartment/roommates`, → `/apartment/rules`). Every day: date + greeting, `AddressCard` (Uber link with the address as destination, 99 = copy + store page, Copier, Montrer → `/address`), `QuickActions` (Wi‑Fi copy, → `/requests/new`, → `/apartment/roommates`, → `/emergency`), "Ce soir à BH" (`TonightCarousel` → `/nightlife/[id]`), "Cette semaine" (rent from 3 days before the 5th or late → `/apartment/payments`, my chores with "C’est fait", cleaning, open requests, holidays → `/calendar`).
- **Explorer** `explorer.tsx` (`explore`): search pill (typing searches the Guide; submit or the red row asks `/assistant?q=`), suggestion chips (ask the assistant), category bar kept in the route param `category` (`forYou` default · `out` · `eat` · `sport` · `culture` · `trips` · `practical`). Pour vous = "Premiers pas" banner → `/first-steps`, the team's pick of the week (a must-go attraction), "À pied de chez vous" (≤ 15 min, falls back to the bars when walking times are unknown). Other categories reuse `GuideContent` (`query`, `only`) and `ExplorerContent` (`segments`).
- **Maison** `maison.tsx` (`sofa`): unchanged body (see below), new TabHeader.
- **Séjour** `sejour.tsx` (`stay`): the former Chez Toi tab (Demander, Payer, Mon contrat, Aide).
- Pages opened from the tabs: `/calendar` (Agenda, `Screen back`), `/first-steps` (apps by group with "Obtenir" + CPF and papers), `/address` (modal: the address large with "Por favor, me leve para:").
- Old Maison detail kept for reference: "Au quotidien" (unit, address maps/copy, Wi‑Fi, tiles → `/apartment/trash`, `/apartment/rules`), "Entre colocataires" (→ `/house/chores`, `/expenses`, `/apartment/roommates`), "Ménage" (→ `/apartment/cleaning`, rating tile → `/apartment/feedback?id=`).

## Screen (`screen.tsx`)
Every screen. Draws the red `BrandBar` on top, then a scrollable gray canvas with a centered 560 px column, 20 px gutter, 32 px between sections.
- `title` / `subtitle`: `display` title and secondary line under the bar.
- `back`: pushed screens — white back arrow in the bar.
- `header`: extra content right under the bar (Home greeting).
- `onRefresh`: pull-to-refresh; pass a function returning a promise (the spinner stays until it settles). On every screen with live data: Accueil, Maison, Chez Toi, payments, cleaning, expenses, "Mes demandes", a request's page. `useHomeState().refresh`, `useRequests().reload` and `useExpenses().reload` return promises and keep what is on screen when the refresh fails.
- No `back` = tab screen: the bar shows the SOS button and the notifications bell.
- `Reveal` is kept for old call sites and renders immediately (screens appear whole).

## BrandBar (`brand-bar.tsx`)
Red bar with the white logo centered (`logo-wordmark-white.png`). Left: `back` → white back arrow (pushed screens); `sos` → SOS pill on tab screens (`Icon` "emergency" 16 + "SOS" callout medium, white on the `onBrandTrack` pill, 32 pt tall with `hitSlop` to 44 pt, opens `/emergency`; accessibility label "Urgences"). Right: `bell` → notifications bell on tab screens (`Icon` "bell" 22 white in a 44 pt button; unread count from `useNotices()` in a 20 pt white badge with a red border and red digits, "9+" above 9; accessibility label "Notifications, 2 non lues"; opens `/notices`). `Screen` passes `sos` and `bell` whenever `back` is off; pushed screens keep the right side empty. Status bar text white.

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
64 px white circle with `Shadow.card`, emoji 28 px, short label under it (one line). Opens `/nearby?category=…`. Emoji are allowed only here, in `HubTile` and in `ChoreBadge`.

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

## Notices (`src/app/notices.tsx`, data `src/lib/notices.tsx`)
`NoticesProvider` (root layout) loads the team's notices, refreshes when the app returns to the foreground (at most every 15 s) and on pull. The page lists them newest first in one card: a dark 8 pt dot + medium title while new, the body in full (callout), a relative date ("Il y a 5 min", "Hier", then "6 nov."). Opening the page marks everything read (the dots stay until the page closes). Rows with `href` open it (in-app route with expo-router, `http…` in the browser); rows without one aren't pressable.

## Chores (`chore-ui.tsx`, screens `src/app/house/`, data `src/lib/chores.tsx`)
- `ChoreBadge`: the chore's emoji in a 40 pt `fill` circle (44 pt in the picker). One of the three places emoji are allowed.
- `ChoreRow`: badge + name + status line, like a `ListRow`; either pressable (opens the chore) or with an accessory (the tick), never both. Children render under the status (the "Échanger" pill).
- `DoneToggle`: 44 pt checkbox, empty `circle` in `textTertiary` / filled check in `success`.
- `PillButton`: small `fill` pill (icon 14 + caption medium), 32 pt with `hitSlop` to 44 pt.
- `RotationPicker`: roommates as 48 pt avatars tapped in order; chosen ones get the dark ring and their place number in a dark badge. `EmojiPicker`: the short emoji list as badges, dark ring on the chosen one.
- Screen: "Cette semaine" (tick for every chore, "Échanger" on my undone chores → inline `PersonPicker` + "Donner la semaine à Léa"), "Les prochaines semaines" (3 weeks, chore left / person right, "Vous" in `text`), "Les tâches" (rows with the order "Vous → Léa → Tom", → edit) + secondary "Ajouter une tâche". Empty state: one card with the primary "Créer la première tâche". Edit: name, emoji, order, primary "Enregistrer", delete = secondary button asking "Appuyez encore pour supprimer".

## How to pay (`how-to-pay.tsx`, data `src/lib/payment-info.ts`)
Section on the payments page, after the rent. Pix card first (`ListRow` with the `pix` icon, "Clé Pix · CNPJ", the key, then a secondary "Copier la clé Pix"), then the bank rows (beneficiary, CNPJ/CPF, bank, agency, account: label + value in `text` + 44 pt copy button), the Wise card only when there is an IBAN, then a card with the team's note and a secondary "Envoyer le reçu sur WhatsApp" (message prefilled). Only filled fields show; no section at all while the team hasn't entered anything.

## Assistant (`assistant-ui.tsx`, screen `src/app/assistant.tsx`, data `src/lib/assistant.ts`)
Not a `Screen`: `BrandBar back`, a scroll with the title, an intro card (what it knows, that it can be wrong, that nothing is saved) and suggestion pills until the first question, then the conversation; a white composer bar at the bottom (hairline on top, `fill` input with radius 22 that grows to ~5 lines, dark 44 pt round send button, `fill` when disabled) inside a `KeyboardAvoidingView`.
- `Bubble`: student = `fill`, right, 85 % wide max; assistant = white card with `Shadow.card`, left, 92 % max; radius 16 with the tail corner at 6.
- `TypingBubble`: three pulsing dots in an assistant bubble (still with reduced motion).
- `SuggestionPill`: like `Chip` but wraps (questions can be long).
- `TextLink`: icon + callout medium, 44 pt tall, under a bubble: "Parler à l’équipe" (WhatsApp) under refused answers, answers that mention WhatsApp and the notConfigured / limit / noRental errors; "Réessayer" under busy / network / server errors. Errors use `error` + `warning` icon inside the bubble, never brand red.
- The conversation stays in memory while the app runs (never on disk); "Nouvelle conversation" clears it.

## Common Issues
### "button cannot be a descendant of button" (web console)
Cause: a `ListRow` with `onPress` whose `accessory` contains another pressable. Solution: a row is either pressable OR has action buttons in its accessory, never both.

## v3 additions (2026-11-08/09)
- **Charlotte** `src/components/charlotte.tsx`: `CharlotteFace({ size, sparkle })`, the assistant's mascot (simplified drawing below 40 pt).
- **Tour** `src/lib/tour.tsx` + `src/components/tour-overlay.tsx`: wrap what a step points at in `TourTarget id="…"`; steps in `TOUR_STEPS`; the overlay dims the screen with a rounded hole and Charlotte's bubble, "Passer" always visible.
- **Cleaner** `src/components/cleaner-card.tsx`: `CleanerCard` on the cleaning page (name, WhatsApp prefilled in Portuguese, call).
- **Stolen phone** `src/components/phone-stolen-ui.tsx` (screens `src/app/phone-stolen/`, data `src/lib/phone-stolen.ts`): `PhoneStolenEntry`, `DangerCard`, `ModeCard`, `NoteCard`, `ProgressBar`, `LinkButtons`, `StepCard`, `PrepRow`.
- **Recap** `src/components/recap-ui.tsx` (screens `src/app/recap/`: hub, `[id]` story, timeline, location opt-in): monthly + semester story slides with `RecapColors`, `RecapEntry` card (latest ready month), `RecapHubRow`, share card captured at 1080×1920. Only what the student did (places, days in/out of BH, photos, Portuguese), never house stats.
- **Portuguese** `src/components/portuguese-ui.tsx`: `PortugueseEntry`, `PhraseOfTheDay`, `AskHowToSay`, lesson pieces.
- **House social** `src/app/house/visitors.tsx`, `packages.tsx`, `my-profile.tsx` (+ edit screens), data in `src/lib/house-social.ts`.
- **BH agenda** `src/components/bh-events-ui.tsx` (page `src/app/events/index.tsx`, data `src/lib/bh-events.ts`): `BhEventsSection` carousel (Explorer › Pour vous and Sortir), `BhEventsList` with category chips and "ce week-end". Titles as published; labels FR/EN.
