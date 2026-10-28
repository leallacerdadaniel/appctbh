# Components — Chez Toi BH app

All in `src/components/`. Use these before writing custom styles. Visual reference: `duo.md`.

## Screen (`screen.tsx`)
Every screen. Draws the red `BrandBar` on top, then a scrollable gray canvas with a centered 560 px column, 20 px gutter, 32 px between sections.
- `title` / `subtitle`: `display` title and secondary line under the bar.
- `back`: pushed screens — white back arrow in the bar.
- `header`: extra content right under the bar (Home greeting).
- `Reveal` is kept for old call sites and renders immediately (screens appear whole).

## BrandBar (`brand-bar.tsx`)
Red bar with only the white logo centered (`logo-wordmark-white.png`); back arrow on the left for pushed screens. Nothing on the right. Status bar text white.

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
Passed as `tabBar` in `src/app/(tabs)/_layout.tsx`. White pill, `Shadow.floating`, 6 px padding; each tab = icon 22 + label 11/15; active tab red on a `fill` pill. Screens keep 120 px bottom padding so nothing hides behind it. Icons per route in its `ICONS` map.

## HeroCard (`hero-card.tsx`)
Generic: `photo={{ uri }}` or `photo={{ placeId }}` (Google, credit shown), `label`, `labelIcon`, `title`, `subtitle`, `cta`, `onPress`. Home uses it for the apartment.

## HubTile + HubGrid (`hub-tile.tsx`)
Entry to a sub-page in a 2-column grid: emoji, bold title, live status in `caption` (2 lines max), chevron. Example: Mon appart → Ménage ("Prochain : Mercredi 21 octobre · 10h00"). Keep titles short enough for one line.

## SegmentedControl (in `src/app/(tabs)/travel.tsx`)
`fill` pill track; the selected segment is a white pill with `Shadow.card` and medium text. Use it to switch views of the same tab (Explorer: BH · Minas · Brésil); use `Chip`s for filters inside a view.

## MustGoBadge (`must-go-badge.tsx`)
Gold medal (`Icon` "medal", `theme.gold`) + "Incontournable" / "Must go" in a white pill, top-left over photos and above the photo on detail pages. Only for places listed in `src/lib/must-go.ts` (chosen by the owner). Each Explorer segment opens with a "Les incontournables" carousel when its list is not empty.

## SegmentedControl (`segmented-control.tsx`)
Generic `options/value/onChange`; used by Explorer (BH · Minas · Brésil · Am. du Sud) and Plats à goûter (Minas · Brésil).

## Dishes (`src/app/restaurants/dishes.tsx`, data `src/lib/dishes.ts` + `src/data/dish-photos.json`)
Dish cards: Wikimedia Commons photo with "© author · licence" (link to the file page), name, description, a "Où goûter" box with pills linking to places already in the app (restaurants, attractions, travel). Dish photos never come from Google (Google photos show places, not dishes). Never use a wrong photo: leave a dish out until a correct free photo exists.

## HoursCard (`hours-card.tsx`)
Week of Google opening hours, Monday first, today in medium weight with "· Aujourd’hui", open/closed in the section subtitle. Hidden when there are no hours.

## Explorer tab (`src/app/(tabs)/travel.tsx`, `src/app/attraction/[id].tsx`, `src/app/travel/[id].tsx`)
BH: one carousel per attraction group (data `src/lib/attractions.ts` + `src/data/attractions.json` from `scripts/attractions.py`). Minas / Brésil: trip chips + full-width 16:9 destination cards (data `src/lib/travel.ts`).

## Travel (`src/app/(tabs)/travel.tsx`, `src/app/travel/[id].tsx`, data `src/lib/travel.ts`)
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
Filter pills: white with hairline border; selected = red fill, white label.

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

## Common Issues
### "button cannot be a descendant of button" (web console)
Cause: a `ListRow` with `onPress` whose `accessory` contains another pressable. Solution: a row is either pressable OR has action buttons in its accessory, never both.
