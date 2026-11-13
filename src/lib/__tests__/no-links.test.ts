import { bodyHasLink, hasLink } from '@/lib/no-links';

/**
 * "No links in anything a student writes" (owner, 2026-11-09). Two ways to get it wrong: refusing an ordinary
 * sentence (the student can't post "R$ 12.50" or "etc.") or letting a real link through.
 */
describe('hasLink: ordinary sentences are not links', () => {
  const fine = [
    // French, with prices, times and abbreviations
    'Quelqu’un veut partager un Uber pour l’aéroport samedi ? Départ vers 14h30, environ R$ 80.',
    'Je vends un ventilateur, 50 R$. Il marche très bien, etc. Écrivez-moi ici.',
    'Le loyer est de R$ 2.400,00 et le ménage coûte 12.50 € de plus.',
    'RDV à 19.30 devant l’immeuble, p. ex. au 3e étage, apt. 802. N.B. : apportez de l’eau.',
    'M. Dupont et Mme Martin arrivent le 15/11. S.V.P. prévenez la portaria.',
    // English
    'Does anyone know a good dentist? I’m approx. 10 min. from Savassi, e.g. near St. Patrick’s.',
    'Meet at 7 p.m. at No. 5. Dr. Silva said the U.S. visa takes 3.5 weeks, i.e. a while.',
    'Selling a fan for R$50.00. It works, a.k.a. a bargain... really!',
    // E-mail-like words and handles that are not addresses
    'Envoyez-moi un e-mail ou un message, mon insta c’est @lea.martin',
    'Write me an email @ any time (my handle is lea_m).',
    // Portuguese shown to the doorman
    'Olá! Vou receber a visita de João Silva no sábado, 15/11, por volta das 20h30.',
  ];
  it.each(fine)('passes: %s', (text) => {
    expect(hasLink(text)).toBe(false);
  });

  it('passes empty values', () => {
    expect(hasLink('')).toBe(false);
    expect(hasLink(null)).toBe(false);
    expect(hasLink(undefined)).toBe(false);
  });
});

describe('hasLink: real links are caught, whatever the disguise', () => {
  const links = [
    'https://exemple.com/page',
    'voici le lien : http://185.12.3.4/login',
    'HTTPS://EXEMPLE.COM',
    'www.site-louche.xyz',
    'WWW.Exemple.Com',
    // no scheme
    'allez sur exemple.com.br pour gagner un iPhone',
    '(voir exemple.fr)',
    'Tout est sur exemple.fr.',
    'maps.app.goo.gl/AbCd123',
    // shorteners and messaging invites
    'bit.ly/3xYz',
    'Bit.Ly/3xYz',
    't.co/abc',
    'wa.me/5531999999999',
    'rejoignez le groupe : chat.whatsapp.com/AbCdEf',
    't.me/joinchat',
    'youtu.be/dQw4w9WgXcQ',
    'instagram.com/lea.martin',
    // an e-mail address is a way out of the app too
    'écrivez à lea.martin@gmail.com',
    // a link on its own line, or inside markdown
    'Regardez ça\nhttps://exemple.io',
    '[cliquez ici](https://exemple.co/x)',
  ];
  it.each(links)('refuses: %s', (text) => {
    expect(hasLink(text)).toBe(true);
  });

  // Found by these tests on 2026-11-10 (the rule was a list of endings) and fixed the same day: a domain followed
  // by a path is a link whatever its ending.
  const anyEnding = ['linktr.ee/lea.martin', 'is.gd/AbCd', 'rb.gy/abcd12', 'lnkd.in/eAbCd', 'shorturl.at/abcde', 'site-louche.ru/login', 'exemple.pt', 'exemple.ch/x', 'allez voir 185.12.3.4'];
  it.each(anyEnding)('refuses: %s', (text) => {
    expect(hasLink(text)).toBe(true);
  });

  it('known trade-off: a site named in a sentence is refused too', () => {
    // The student sees "links are not allowed" and writes "Booking" instead.
    expect(hasLink('J’ai réservé sur Booking.com')).toBe(true);
    expect(hasLink('J’ai réservé sur Booking')).toBe(false);
  });
});

describe('hasLink: a full stop with no space after it is not a link', () => {
  // Refused by the old rule (review of 2026-11-10): the next word happened to be a country ending.
  const sentences = [
    'Merci.De rien !',
    'Thanks.It works now',
    'See you at 8.Be there',
    'On se retrouve à 18h.Es-tu dispo ?',
    'Super soirée.Top !',
    'Ouro Preto.Site historique',
    'Tout est ok.Me voilà',
    'C’est la fin.It was great',
    'Départ à 18h.Com’ d’hab',
    'merci.de rien',
    'ok.me voilà',
  ];
  it.each(sentences)('passes: %s', (text) => {
    expect(hasLink(text)).toBe(false);
  });
});

describe('bodyHasLink: what the API client checks before every request', () => {
  it('finds a link anywhere in what the student typed', () => {
    expect(bodyHasLink({ scope: 'all', kind: 'post', body: 'promo sur bit.ly/3xYz' })).toBe(true);
    expect(bodyHasLink({ trip: { description: null, notes: ['ok', 'voir www.exemple.com'] } })).toBe(true);
    expect(bodyHasLink('exemple.com')).toBe(true);
  });

  it('lets a normal request through: ids, dates, numbers, empty values', () => {
    const trip = {
      id: '0b6d6c5e-6f0a-4a57-9d43-3a4f6a2f7c11',
      destination: 'Ouro Preto',
      destinationId: 'ouro-preto',
      startsOn: '2026-11-15',
      endsOn: '2026-11-17',
      seats: 4,
      description: 'Bus à 7h30, budget R$ 350,00 env. par personne.',
    };
    expect(bodyHasLink(trip)).toBe(false);
    expect(bodyHasLink({ going: true, seats: null, note: undefined })).toBe(false);
    expect(bodyHasLink(undefined)).toBe(false);
  });

  it('does not read the fields that hold an address or a secret by nature', () => {
    expect(bodyHasLink({ email: 'lea.martin@exemple.fr', password: 'Abc.com-123' })).toBe(false);
    expect(bodyHasLink({ instagram: 'lea.co', lang: 'fr', code: '123456' })).toBe(false);
  });

  it('does not read what the server signed and the app only sends back', () => {
    // A first-access ticket is "payload.signature" in base64url: now and then it looked like "xx.me-…".
    expect(bodyHasLink({ ticket: 'eyJjcCI6IjEyMyJ9.me-Abc123', password: 'Secret.com1' })).toBe(false);
    expect(bodyHasLink({ answer: 'ok', signature: 'ab.io-xyz', currentPassword: 'old.fr' })).toBe(false);
  });

  it('still checks the other fields of the same request', () => {
    expect(bodyHasLink({ email: 'lea.martin@exemple.fr', reason: 'tout est sur exemple.fr' })).toBe(true);
  });
});
