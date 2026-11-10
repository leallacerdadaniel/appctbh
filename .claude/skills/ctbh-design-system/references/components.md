# Components — Chez Toi BH app

All in `src/components/`. Use these before writing custom styles. Visual reference: `duo.md`.

## Tabs (v3, owner 2026-11-08: "mix do Airbnb com o Revolut")
Order and routes in `src/app/(tabs)/_layout.tsx`; icons in `TabBar`'s `ICONS` (`src/components/tab-bar.tsx`). The Assistant is the raised red button between Explorer and Maison (opens `/assistant`), not a route of the tabs.
- **Accueil** `index.tsx` (`home`): arrival mode (`useWelcome` in `src/lib/welcome.ts`, 7 days before to 14 after the arrival, `/?welcome=1` forces it): `WelcomeHero` (photo + TabHeader on it) and the 5-step list (Wi‑Fi copy, address copy, → `/first-steps`, → `/apartment/roommates`, → `/apartment/rules`). Every day: date + greeting, `AddressCard` (Uber link with the address as destination, 99 = copy + store page, Copier, Montrer → `/address`; the four buttons wrap 2 × 2 when `fontScale` > 1.2), `QuickActions` (Wi‑Fi copy, "Services en plus" → `/requests/new`, → `/apartment/roommates`, → `/emergency`; SOS label in `brandText`), the bars carousel (`TonightCarousel` → `/nightlife/[id]`; the same bars and clubs all day, so only the title follows the clock in Belo Horizonte: "Sortir à BH" from 05:00, "Ce soir à BH" from 17:00, `isEveningInBh()` in `home-v3.tsx`, never the phone's zone), "Cette semaine" (rent from 3 days before the 5th or late → `/apartment/payments`, my chores with "C’est fait", cleaning, open requests, holidays → `/calendar`), "Prochain rendez-vous Chez Toi" (the next team event within 14 days, `EventCard` → `/community/events/[id]`, "Communauté" link; nothing while loading, on error or with no event; also in arrival mode), `SurveyInvite`, `RecapEntry`. Buttons: only the rent "Payer" is a red pill; "Répondre" is a gray `RowPill` (UX review 2026-11-09); the recap card stays red (owner).
- **Explorer** `explorer.tsx` (`explore`): search pill (typing searches the Guide; submit or the red row asks `/assistant?q=`), suggestion chips (ask the assistant), category bar kept in the route param `category` (`forYou` default · `practical` · `out` · `eat` · `sport` · `culture` · `trips`; "Pratique" second since 2026-11-09), scrolled so the active category is centred, also when opened by link (`/explorer?category=trips`). The search placeholder sits in the flow (the input lies over it) so the pill grows with large text. Pour vous = "Premiers pas" banner → `/first-steps`, the team's pick of the week (a must-go attraction), "À pied de chez vous" (≤ 15 min, falls back to the bars when walking times are unknown). Other categories reuse `GuideContent` (`query`, `only`) and `ExplorerContent` (`segments`). One entry per need (UX review 2026-11-10): "Autour de moi" is in Pour vous only, and "Courses" / "Pharmacie" exist once, in Pratique › "Autour de chez vous" (see `CategoryCircle`).
- **Maison** `maison.tsx` (`sofa`): Au quotidien (Wi‑Fi rows say "Demandez à l’équipe" while empty; the password row then opens WhatsApp with a prefilled message) · À l’immeuble (visitors, packages; the hint explains "portaria (l’accueil de l’immeuble)") · Entre colocataires · **Entre résidents** (the 🤝 Communauté tile, its own section since 2026-11-09) · Ménage.
- **Séjour** `sejour.tsx` (`stay`): Demander ("Services en plus (payants)" → `/requests/new`, "Un problème ? (gratuit)" → `/requests/maintenance`, Mes demandes), Payer, Mon contrat, Aide (Charlotte, WhatsApp, the tour), **Votre séjour** (Mes récaps with the `photo` icon, Donner mon avis, Parrainer un ami, Une carte pour ma famille). No recap card on Séjour (it is on Accueil). The "app closes on …" notice after the stay is an `InlineMessage kind="warning"`.
- Request names, the same everywhere (rows, Accueil shortcut, screen titles): "Services en plus (payants)" / "Paid extra services" (`requests.homeNew`, `requests.extras`) and "Un problème ? (gratuit)" / "Something broken? (free)" (`requests.maintenanceTitle`, also the title of the maintenance screen).
- Pages opened from the tabs: `/calendar` (Agenda, `Screen back`; see "Agenda" below), `/first-steps` (apps by group with "Obtenir" + CPF and papers), `/address` (modal: the address large with "Por favor, me leve para:").
- Old Maison detail kept for reference: "Au quotidien" (unit, address maps/copy, Wi‑Fi, tiles → `/apartment/trash`, `/apartment/rules`), "Entre colocataires" (→ `/house/chores`, `/expenses`, `/apartment/roommates`), "Ménage" (→ `/apartment/cleaning`, rating tile → `/apartment/feedback?id=`).

## Screen (`screen.tsx`)
Every screen. Draws the red `BrandBar` on top, then a scrollable gray canvas with a centered 560 px column, 20 px gutter, 32 px between sections.
- `title` / `subtitle`: `display` title and secondary line under the bar.
- `back`: pushed screens — white back arrow in the bar.
- `header`: extra content right under the bar (Home greeting).
- `onRefresh`: pull-to-refresh; pass a function returning a promise (the spinner stays until it settles). On every screen with live data: Accueil, Maison, Chez Toi, payments, cleaning, expenses, "Mes demandes", a request's page. `useHomeState().refresh`, `useRequests().reload` and `useExpenses().reload` return promises and keep what is on screen when the refresh fails.
- `footer`: the page's main action pinned under the scroll (white bar, hairline on top, padded to the safe area, same column and gutter as the content). Only where the answer must stay reachable while a long page scrolls: the group trip (2026-11-10). One button, or a status + a secondary button; an error of that action goes in the footer, above the button.
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
`expanded` (2026-11-10): a circle that opens a choice under its row instead of a page gets a 2 pt dark ring while open. Used by "Courses" and "Pharmacie" in Explorer › Pratique: one shortcut per need, and a card under the row asks "Chez moi" (the list near the apartment, `/nearby?category=…`) or "Où je suis" (Google Maps around the phone, external icon). While the apartment has no list for that category there is nothing to choose: the circle opens Google Maps directly.

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
- `PersonPicker`: roommates as 48 px avatars with the first name underneath; selected = dark ring + small green check. Used for "who paid", "split between", "who pays / to whom". The student comes first as "Vous". A roommate who left only appears in "who pays / to whom" (while a balance with them is open), with "(parti·e)" on a second line in `textSecondary`; never in a new expense.
- `PersonName`: a person's name in the expenses; someone who left gets a quiet "(parti·e)" / "(left)" in `caption` + `textSecondary` after it (2026-11-10: they showed as "?"). Without a name from the server: "Ancien colocataire". An expense that involves someone who left has no "Modifier" (one gray line says why); "Supprimer" stays.
- Repayments read "Vous avez payé Hugo" · "Hugo vous a payé" · "Hugo a payé Chloé" (`paymentLabel`), never "Vous a payé".
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
- **Tour** `src/lib/tour.tsx` + `src/components/tour-overlay.tsx` (rewritten 2026-11-09 after it froze the app): wrap what a step points at in `TourTarget id="…"` — it registers only while its screen is focused (`useIsFocused`), so a hidden tab's top row never counts. Steps in `TOUR_STEPS` (8 at most, no closing step): welcome · address (or `checklist` in arrival mode, "Pour bien démarrer") · quick · top (the whole `TabHeader` row: initials + bell) · charlotte (the raised button; the −30 raise sits on the target so the ring circles it) · explorer · maison · séjour ("Terminer"). `start()` marks the tour as seen first, scrolls Accueil to the top (`useTourScrollTop(scrollRef)` + `Screen scrollRef`), measures every target once and keeps only the steps whose target is ≥ 70 % visible above the tab bar. The overlay: title (semibold) + Charlotte's line, text capped at `MaxFontScale`; the bubble goes below the target, else above, else where there is more room, always clamped inside the safe area; tapping the dimmed backdrop goes to the next step; "Passer" on every step but the last.
- **Cleaner** `src/components/cleaner-card.tsx`: `CleanerCard` on the cleaning page (name, WhatsApp prefilled in Portuguese, call).
- **Stolen phone** `src/components/phone-stolen-ui.tsx` (screens `src/app/phone-stolen/`, data `src/lib/phone-stolen.ts`): `PhoneStolenEntry`, `DangerCard`, `ModeCard`, `NoteCard`, `ProgressBar`, `LinkButtons`, `StepCard`, `PrepRow`.
- **Health** `src/components/health-ui.tsx` (screen `src/app/health/index.tsx`, data and sources `src/lib/health.ts`): `EmergencyNumbers` (192, 190, 193 rows with the number large in red; shared with the SOS page) and `HealthEntry` (green `TintRow` in Explorer › Pratique; the SOS page has a `ListRow` in its Santé section). The page: emergency numbers, "Où aller" (UPA Centro-Sul, Mater Dei Contorno, Lifecenter as `ListRow`s that open Google Maps, then a `NoteCard` on paying and the refund), front-desk phrases with audio (`PhraseRow` + `useSpeaker` from `portuguese-ui`), pharmacies (Araujo Maps search + the app), Doctoralia, CVV 188; the "not medical advice" line is the page subtitle.
- **Recap** `src/components/recap-ui.tsx` (screens `src/app/recap/`: hub, `[id]` story, timeline, location opt-in): monthly + semester story slides with `RecapColors`, `RecapEntry` card (latest ready month), `RecapHubRow`, share card captured at 1080×1920. Only what the student did (places, days in/out of BH, photos, Portuguese), never house stats.
- **Portuguese** `src/components/portuguese-ui.tsx`: `PortugueseEntry`, `PhraseOfTheDay`, `AskHowToSay`, lesson pieces.
- **House social** `src/app/house/visitors.tsx`, `packages.tsx`, `my-profile.tsx` (+ edit screens), data in `src/lib/house-social.ts`.
- **BH agenda** `src/components/bh-events-ui.tsx` (page `src/app/events/index.tsx`, data `src/lib/bh-events.ts`): `BhEventsSection` carousel (Explorer › Pour vous and Sortir), `BhEventsList` with category chips and "ce week-end". Titles as published; labels FR/EN.
- **Top rated near home** `src/components/top-rated-near-home.tsx` (data `nearby.topRated` from `scripts/nearby.py`): Explorer › Pour vous (restaurants, bars, cafés with chips), Manger (restaurants, cafés), Sortir (bars). `ListRow` with ★ rating · reviews · $$, walk time and an external icon; a tap opens the place in Google Maps; Google credit caption under the list. Hidden while the apartment has no list.
- **Around me** `src/components/around-me.tsx`: "Autour de moi" row of white circles (restaurants, bars, cafés, ATM) in Explorer › Pour vous only (2026-11-10: it was also in Voyages, and its pharmacy and groceries doubled the circles of Pratique). Each opens a Google Maps search where the phone is (Maps URL, no key, free); the app never reads the location. `openAroundMe(id)` is also what "Où je suis" calls for the pharmacy and the groceries.
- **Feedback, survey, referral (wave 14)** `src/components/feedback-ui.tsx` (screens `src/app/feedback/`, `src/app/survey.tsx`, `src/app/referral.tsx`, data `src/lib/feedback.ts`, function `app-feedback`): `FeedbackHubRow` (Séjour › Aide, "1 nouvelle réponse de l’équipe" in `info`) and `ReferralHubRow`; `SurveyInvite` = one `TintRow` (star on `warningSoft`) with a primary `RowPill` "Répondre" at the end of Accueil, only while the server says a survey is due. `ScoreScale`: 0–10 as 44 pt `fill` squares on two fixed rows of six slots (0–5, 6–10), the chosen one red like a selected `Chip`. `CheckRow`: whole-row checkbox (testimonial permission). `NewBadge`: dark 8 pt dot + "Nouveau" on a team reply not seen yet (as on the notices page). Feedback cards: topic + "Envoyé le …", the message, then the team's reply under a hairline (`infoSoft` circle). Referral: code large (display, letter-spaced) with "Copier" and a primary "Partager mon code" (native share sheet), the team's reward/terms only when filled, "Mes parrainages" as `TintRow`s with a status pill (green signed/rewarded, amber visit, gray otherwise; never brand red).

## Community (`src/components/community-ui.tsx`, 2026-11-09)

- `PostCard`: white card for a wall post. `AuthorLine` (avatar with the author's initials, "Vous"/"You" for the student,
  date and kind), the text, a comment count; the whole card opens the post. The student's own post that isn't up
  shows `ContentStatusNote`: `Notice` "en vérification" when the team holds it, red `InlineMessage` with the AI's
  reason when it was not published.
- `CommentRow`: `AuthorLine` + text indented under the name; a chevron opens the options (delete mine; report or
  block someone else's, through `Alert`, never more than two actions + cancel for Android).
- `EventCard` (date block in a `fill` square, title, time · venue, going count) and `TripCard` (travel icon in a
  `fill` square, destination, dates · organiser, status: "Vous y allez" in green, "Complet", "En vérification").
- `GroupTripsEntry`: one `ListRow` card at the top of Explorer › Voyages, "Partir en groupe".
- Group trip page (`src/app/community/trips/[id].tsx`): the destination's `PlacePhoto` (16:9, credit below) on top when `destinationId` is a Voyages destination. Joining and leaving sit in the pinned `Screen footer` (2026-11-10): primary "Je viens" before, then "✓ Vous y allez" in `success` with a secondary "Je ne viens plus" (the row wraps with large text). No bar for the organiser, a cancelled or unpublished trip, a trip that is over, or a full one the student is not in ("Complet" is then a line in the first card, not a disabled button).
- `EventCard` is also Accueil's "Prochain rendez-vous Chez Toi" (next event within 14 days).
- Explorer › Voyages (`Trips` in `explorer-content.tsx`): under the must-go carousel the list shows the other destinations only (never the same card twice in a row); with a trip-type chip selected the carousel hides and the list has everything.
- Writing (post, comment, trip) asks for the community guidelines once (`/community/charter`, numbered `StepNumber`
  rules + a `Notice` on moderation); report is its own page (`/community/report`) with reason chips. Under the
  `Notice`, a card with one plain paragraph (what students publish is checked by an AI, Claude, by Anthropic, before
  the team) and the privacy policy row (`openPrivacyPolicy`); it informs only, so the terms version does not change.

## Agenda (`src/app/calendar.tsx`, data `src/lib/events.ts`, colors `event-style.ts`)

Month grid with up to three dots per day, filter chips (one per kind, in `eventKinds` order), the selected day's list and "À venir" (8 rows). Kinds and colors: national `eventNational`, city `eventCity`, optional `eventOptional`, cleaning `eventCleaning`, contract `text`, **Chez Toi event** `brandText` (the brand's own events: a small red accent), **group trip** `eventTrip`.
- Community rows (2026-11-10): Chez Toi events that are on (title, date · time, venue on its own line, "✓ J’y vais" in `success` when the student answered yes) and the published group trips the student is part of (start – end; every day of the trip gets the dot). They open their page (small chevron); the other rows jump to their day.
- The community is optional data: the calendar never waits for it and shows no error when it fails; the chips are always there, so nothing jumps when the events arrive.
- Days are Belo Horizonte days (UTC−3) whatever the phone's zone: `bhToday()`, `bhDateTime()` in `src/lib/events.ts`.

## Brand bar shape (2026-11-09)

`BrandBar` has rounded bottom corners (24), a diagonal gradient (`Brand.barGradient`, brand red to deep wine, via `expo-linear-gradient` in an absolute fill with the same curve) with a faint white light at the top, and a wine shadow (`0 8px 22px rgba(120, 5, 16, 0.28)`). `Screen back` renders it with `overlay`: absolutely positioned over the page, the scroll content padded by `insets.top + BRAND_BAR_HEIGHT` (56) and the scroll indicator and pull-to-refresh offset by the same, so cards slide under the curve. Screens that draw `BrandBar` themselves (assistant, change-password, home gate) keep it in the layout flow. Back arrow: white chevron 20 in a 36 pt circle filled with `onBrandTrack`, 44 pt touch area via `hitSlop`.

## UX review (2026-11-09), small rules

- `SectionHeader` action ("Voir tout", "Explorer", "Agenda") is red **text** in `brandText` (`#D20B1E`, contrast 4.9:1 on the canvas), capped at `MaxFontScale`.
- `InlineMessage` has three kinds: `error`, `warning` (something to do before a date, not a failure), `success`.
- `AppText` caps `display` at `MaxFontScale` (1.4) by default; pills (`Chip`, `RowPill`, `StatusPill`, `PillButton`, `AddressButton`), tab bar labels, `SegmentedControl`, `LanguageSwitch` (never shrinks, 8 pt segment padding so "EN" stays on one line) and the `TabHeader` pill pass `maxFontSizeMultiplier` too.
- Profile: "Supprimer mon compte" is the last thing on the page, a small gray row (trash icon + caption) under the "Se déconnecter" card, never inside the everyday list.
- Tab bar: the Charlotte button's accessibility label is "Charlotte, votre assistante" (`chezToi.assistant`).

## Opening animation (`app-loader.tsx`, map in `minas-shape.ts`, 2026-11-09)

`AppOpening` sits over the whole app in `src/app/_layout.tsx` (after `<RootStack />`) and plays while the session and then the student's data load; it plays again after signing in. While it runs, `RootStack` renders nothing (and `HomeGate` only shows the error / no-rental card on the brand gradient).

- **Frame 0 = native splash**: `#B80A1C` + `assets/brand/minas-white.png`, 112 pt wide, centered (`app.json` › `expo-splash-screen`). Change one, change the other (`SPLASH_BACKGROUND`, `SPLASH_MAP_WIDTH`).
- **Entrance (1.4 s)**: the brand gradient rises with two drifting lights; the map shrinks into its place in the 240 pt wordmark; "CHEZ" and "TOI BH" (`logo-chez-white.png`, `logo-toibh-white.png`) slide out of the map's sides.
- **Waiting** (only if the data is not there yet): red dot on Belo Horizonte, three white rings from it, caption `gate.loading` and a thin running bar.
- **Exit (~1 s)**: the camera dives into Belo Horizonte (exponential zoom); the letters fly off; the map grows white, then becomes a window (even-odd hole in the gradient) onto the screen underneath (Accueil or login).
- The map is a vector traced from the wordmark (`python3 scripts/brand/minas_shape.py` regenerates `minas-shape.ts`, the splash PNG and the letter crops); `minasPath()` is a worklet, animated with `useAnimatedProps` on SVG paths. Reduced motion: no entrance, a plain fade out.
- Expo Go shows its own loading screen first; the seamless splash → opening only exists in a native build.
