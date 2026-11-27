import { splitUnit } from '../address-unit';

describe('splitUnit', () => {
  it('takes "Apto 02" out of the address', () => {
    expect(splitUnit('Rua Coral, 51 - São Pedro. Apto 02 Belo Horizonte - MG')).toEqual({
      address: 'Rua Coral, 51 - São Pedro. Belo Horizonte - MG',
      unit: '02',
    });
  });

  it('takes a bare number between dashes after the street number', () => {
    expect(splitUnit('Rua das Mercês, 29 - 1402 - Prado. Belo Horizonte - MG')).toEqual({
      address: 'Rua das Mercês, 29 - Prado. Belo Horizonte - MG',
      unit: '1402',
    });
  });

  it('reads "Apartamento nº 302" and "apt. 7B"', () => {
    expect(splitUnit('Rua X, 10, Apartamento nº 302 - Lourdes').unit).toBe('302');
    expect(splitUnit('Rua Y, 5 - apt. 7B - Serra').unit).toBe('7B');
  });

  it('leaves addresses without an apartment number alone', () => {
    for (const a of [
      'Rua Cobre, 99 - Cruzeiro. Belo Horizonte - MG',
      'Av. Afonso Pena, 3549 - Belo Horizonte - MG',
      'Rua Major Lopes, São Pedro. Belo Horizonte - MG',
      'BR-356, 3049, Belvedere, Belo Horizonte, MG',
      'Rua Expedicionário Alício, 370 - Mangabeiras. Belo Horizonte',
    ]) {
      expect(splitUnit(a)).toEqual({ address: a, unit: null });
    }
  });
});
