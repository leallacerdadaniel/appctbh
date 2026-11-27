/**
 * The apartment number when the site wrote it inside the address (27/11/2026: 2 of the 31 apartments of 2027/1,
 * "Rua Coral, 51 - São Pedro. Apto 02 Belo Horizonte - MG" and "Rua das Mercês, 29 - 1402 - Prado. …"). Used only when
 * the team hasn't filled the number (panel › Informações dos aptos, or the site's address complement): the address
 * comes back without it, so the card doesn't show it twice or as if it were the neighbourhood.
 */
export function splitUnit(location: string): { address: string; unit: string | null } {
  // "Apto 02", "Apt. 302", "Apartamento 1402", "ap 7B", with or without "nº".
  const named = location.match(/\s*[,-]?\s*\bap(?:to|t|artamento)?\.?\s*(?:n[ºo°.]?\s*)?(\d{1,4}[A-Za-z]?)\b/i);
  if (named?.index !== undefined) {
    const address = (location.slice(0, named.index) + ' ' + location.slice(named.index + named[0].length))
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,])/g, '$1')
      .trim();
    return { address, unit: named[1] };
  }
  // "Rua X, 29 - 1402 - Prado": a bare number between dashes right after the street number.
  const bare = location.match(/^([^-]+?,\s*\d+[A-Za-z]?)\s+-\s+(\d{1,4}[A-Za-z]?)\s+-\s+/);
  if (bare) return { address: `${bare[1]} - ${location.slice(bare[0].length)}`, unit: bare[2] };
  return { address: location, unit: null };
}
