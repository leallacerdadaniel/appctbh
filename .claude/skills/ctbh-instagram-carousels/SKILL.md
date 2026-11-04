---
name: ctbh-instagram-carousels
description: Creates Instagram carousel scripts (a PDF with many posts, in English) for Chez Toi BH from the content already in the student app (Explorer, Guide, nightlife, sports, calendar and holidays). Use when the user asks for "carrosséis", "posts de Instagram", "roteiro de carrossel", "ideias de posts sobre BH", "conteúdo para o Instagram" or "novos carrosséis". Output is a text script with a photo suggestion per slide, not the finished slide images. Do not use for app screens, design system or data scripts.
metadata:
  author: Chez Toi BH
  version: 1.0.0
---

# CTBH Instagram Carousels

## Contexto

Chez Toi BH posts carousels on Instagram (@cheztoibh) for francophone students coming to Belo Horizonte. The team designs the slides in a design canvas, so this skill only produces the **script**: the text of every slide plus a photo suggestion. The format follows [references/roteiro-modelo.pdf](references/roteiro-modelo.pdf) (the "Roteiro – Novos carrosséis Chez Toi BH" file from the owner); its structure is explained in [references/formato-roteiro.md](references/formato-roteiro.md).

All facts come from the app. No invented content: if the app does not say it, it does not go in a slide.

## Etapa 1: Propose the post ideas first

1. Read [references/mapa-de-conteudo.md](references/mapa-de-conteudo.md) to see which app file feeds which kind of post.
2. List the ideas (title, goal, what it covers) and **wait for the owner's confirmation** before writing. If there is content, there is a post: there is no fixed number.
3. Use [references/ideias-de-posts.md](references/ideias-de-posts.md) to avoid repeating posts already produced.

## Etapa 2: Write the posts as JSON

1. Create `carrosseis/AAAA-MM-DD/posts.json` at the project root (`~/Desktop/App CTBH/carrosseis/`) with this shape: `title`, `date`, `overview`, `to_confirm` (list of `post` + `text`), `photo_note`, `posts` (each with `n`, `title`, `goal`, `summary`, `slides`). Each slide has `slide`, `title`, `text`, `photo`. Copy the structure of an existing `posts.json`.
2. Every post has 6 slides: cover, 4 content slides, final slide ("Save this post" or a question), and the final slide always ends with `+ Chez Toi BH block + DM @cheztoibh`.
3. Read the source files in `app/src/lib/` and `app/src/data/` again for each post. Take the English strings (`en`). Do not translate from the French.
4. Photo suggestion = a file from `app/assets/` (folders in `photo_note`). Restaurants have no bundled photos (Google photos cannot be reused): say "own photo".
5. Add to `to_confirm` anything unverified: dates that depend on a decree, prices, flight schedules, rights of the photos, entry rules by nationality. Details in [references/formato-roteiro.md](references/formato-roteiro.md).

## Etapa 3: Build the PDF

Run `python3 -I app/.claude/skills/ctbh-instagram-carousels/scripts/build_roteiro.py carrosseis/AAAA-MM-DD/posts.json "carrosseis/AAAA-MM-DD/Roteiro – Carrosséis Chez Toi BH.pdf"`. It needs Google Chrome (headless print to PDF) and no Python packages. Then open the PDF and check page 1 and one post page.

## Regras

- English only, unless the owner asks for a French version.
- Brand red is #E30F1E. Tone: friendly, practical, "we take care of you", never alarming.
- One post per theme. Cover with a clear promise, 4 content slides with short text (the real slide is small), final slide with a call to save, share or comment.
- Walking times, prices and dates are copied from the app with their year (for example "May 2026"). Do not round or update them from memory.
- Holidays: compute dates with the rules in `app/src/lib/holidays.ts` and check the weekday before writing it ("Nov 13 is a Saturday"). Optional days off ("ponto facultativo") and bridges are never promised as days off.
- The output folder holds only the final PDF and its `posts.json`. Drafts stay in the scratchpad.

## Atualizações Progressivas

(Register here the rules learned in later sessions: owner corrections, tone changes, formats that worked.)
