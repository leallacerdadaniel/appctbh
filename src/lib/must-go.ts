/**
 * "Incontournables": places the Chez Toi team marks with a medal in Explorer.
 * Chosen by the owner — ids from src/lib/attractions.ts (bh) and src/lib/travel.ts (mg, br, sa).
 * Order here = order in the "Incontournables" carousel.
 */
// Picked by the owner on 2026-10-16 (checklist artifact).
export const MUST_GO: { bh: string[]; mg: string[]; br: string[]; sa: string[] } = {
  bh: ['pampulha-church', 'pampulha-lagoa', 'mercado-central', 'mercado-novo', 'praca-liberdade', 'mangabeiras'],
  mg: ['inhotim', 'ouro-preto', 'serra-do-cipo', 'capitolio'],
  br: ['rio', 'ilha-grande', 'salvador', 'lencois', 'amazonia', 'angra'],
  sa: ['bariloche', 'machu-picchu', 'atacama'],
};

export const isMustGo = (id: string) => Object.values(MUST_GO).some((ids) => ids.includes(id));
