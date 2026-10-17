# Tokens — Chez Toi BH app

Source of truth: `src/constants/theme.ts`. If you change a value there, change it here too.

## Colors (light only)

| Token | Value | Use |
|---|---|---|
| `background` | `#F4F4F2` | Canvas behind every screen (light gray) |
| `surface` | `#FFFFFF` | Cards, search pill, tab bar, category circles |
| `fill` | `#EFEEEA` | Inputs, unselected chips, avatars, photo placeholders |
| `scrim` | `rgba(0,0,0,0.45)` | Dark layer under text placed on photos, rating pills |
| `text` | `#141414` | Titles, body, selected chip background |
| `textSecondary` | `#6B6A67` | Secondary lines, metadata |
| `textTertiary` | `#A09E99` | Chevrons, hints, placeholders (non-essential only) |
| `line` | `#E9E7E3` | Hairline dividers, card hairline border |
| `brand` | `#E80C20` | Home header band, logo, back chevron, list row icons, primary button, active tab |
| `brandPressed` | `#C70A1B` | Primary button pressed |
| `onBrand` | `#FFFFFF` | Text on brand |
| `onBrandMuted` | `rgba(255,255,255,0.82)` | Secondary text on the red band |
| `success` | `#1F7A4D` | "Ouvert", confirmations |
| `error` / `errorSoft` | `#B42318` / `#FEF3F2` | Errors (with icon + text) |
| `warning` | `#B54708` | Tips, attention |
| `eventCity` / `eventOptional` / `eventCleaning` | `#DC6803` / `#1570EF` / `#0E9384` | Calendar dots only |

## Typography

Light and small (owner asked twice on 2026-10-16: "fontes grandes e grossas… quero mais clean").

| Variant | Font | Size / line height | Use |
|---|---|---|---|
| `display` | Outfit 400 | 24 / 30, letter-spacing −0.2 | Screen title, greeting, hero title |
| `title` | Outfit 400 | 17 / 22 | Section headers |
| `body` | Inter 400 | 15 / 21 | Main text, list row titles |
| `callout` | Inter 400 | 13 / 18 | Secondary lines, descriptions |
| `caption` | Inter 400 | 12 / 16 | Metadata, footnotes (tab labels 11) |

Fonts loaded: Inter 400/500, Outfit 400. `Fonts.bodyMedium` (Inter 500) only for buttons, names on cards and the active tab. List rows are regular. Never add semibold or bold.

## Spacing

`xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · xxxl 48`

- `Spacing.gutter` = 20 (screen side padding)
- `Spacing.section` = 32 (between sections)
- List row: min height 56, vertical padding 14, horizontal padding 0 (rows sit on the gutter)

## Radius

`sm 10` (inputs, small controls) · `md 14` (buttons, photos inside cards) · `lg 16` (cards) · `pill 999` (chips, search, tab bar)

## Shadow

`Shadow.card` = `boxShadow: '0 2px 12px rgba(20, 20, 20, 0.06)'` — cards, search pill, category circles.
`Shadow.floating` = `boxShadow: '0 6px 24px rgba(20, 20, 20, 0.12)'` — floating tab bar only.
Never write shadow values inline.

## Sizes

- Tap target ≥ 44
- Icons: 20 in rows, 24 in tab bar, 17 inside buttons
- Max content width 560 (tablet / web)

## Logo assets (`assets/brand/`)

- `logo-wordmark-white.png` — on the red Home band, 135 × 32
- `logo-wordmark.png` — red on white, pushed screens' header, 101 × 24
- `logo-tile.png` — red square, login and splash
- A high-resolution SVG is still pending from the owner; replace the PNGs when it arrives.
