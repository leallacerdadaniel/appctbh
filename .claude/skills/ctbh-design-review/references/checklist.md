# Visual checklist — one pass per screenshot

## Hierarchy
- [ ] One thing is clearly the most important on the screen (usually the `display` title or a key value).
- [ ] Sections are separated by ≈32 px.
- [ ] Section titles are sentence case `title` text, no uppercase labels, no icons next to them.

## Brand (DUO reference: `ctbh-design-system/references/duo.md`)
- [ ] Red brand bar with the white logo at the top of the screen; back arrow on pushed screens; white status bar text.
- [ ] Gray canvas, content in white cards with soft shadow, one card level only.
- [ ] Places/restaurants shown with photos, rating pill over the photo.
- [ ] Each section has a title and a one-line subtitle when useful; "Voir plus ›" for full lists.
- [ ] Red only in its listed places (bar, primary button, active tab, row icons, selected filter).

## Loading
- [ ] Reload the screen: it appears whole at once — no sections or icons popping in one after another.

## Color
- [ ] No tinted bubbles around UI icons. Status colors (open = green) only as small text.
- [ ] Light mode only.

## Icons
- [ ] Every icon helps recognize something (tab, row type, action). Remove decorative ones.
- [ ] Same family and weight everywhere (SF Symbols / Material Symbols through `Icon`).
- [ ] No icon in a colored circle/square.

## Lists and cards
- [ ] Lists use `ListGroup`/`ListRow` inside a `Card`, chevron only when the row navigates.
- [ ] Never a card inside a card. Shadows only via `Shadow` tokens.

## Text
- [ ] Only the 5 type variants. Nothing heavier than weight 500, nothing that looks bold or big. Nothing smaller than 12 (credits 10).
- [ ] No text is cut with "…" anywhere (except tab bar labels); long text wraps.
- [ ] Every string exists in FR and EN.

## Touch and layout
- [ ] Tap targets ≥ 44 px.
- [ ] 20 px side gutter; nothing touches the screen edge except horizontal scrollers.
- [ ] Nothing hidden behind the tab bar at the bottom of the scroll.

## History
- 2026-10-16: created after v1 was rejected ("pesado, ícones genéricos").
- 2026-10-16: added Brand and Loading after v2 feedback ("tem que ter o vermelho e a logo", "muito travado").
- 2026-10-16: Brand section rewritten for the DUO reference (canvas + cards, photos, brand bar on every screen).
