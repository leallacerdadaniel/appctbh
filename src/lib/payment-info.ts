import { useCallback, useEffect, useState } from 'react';

import { houseApi } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';
import type { NoticeText } from '@/lib/notices';

/**
 * How to pay Chez Toi (Pix, bank account, euro account at Wise), from the "app-house" function.
 * Any field can be empty; the screen shows only what is filled in. `info` is null while the team
 * hasn't entered anything.
 */
export type PaymentInfo = {
  beneficiary: string | null;
  /** CNPJ (14 digits) or CPF (11 digits), as the team typed it. */
  document: string | null;
  pixKey: string | null;
  pixKeyType: string | null;
  bank: string | null;
  agency: string | null;
  account: string | null;
  eurAccountHolder: string | null;
  eurIban: string | null;
  eurSwift: string | null;
  notes: NoticeText | null;
};

type State = { status: 'loading' } | { status: 'ready'; info: PaymentInfo | null } | { status: 'error' };

export function usePaymentInfo() {
  const { token } = useAuth();
  const [state, setState] = useState<State>({ status: 'loading' });

  const reload = useCallback(() => {
    if (!token) return Promise.resolve();
    return houseApi<{ info: PaymentInfo | null }>('payment-info', { token })
      .then((r) => setState({ status: 'ready', info: r.info ?? null }))
      .catch(() => setState((s) => (s.status === 'ready' ? s : { status: 'error' })));
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { state, reload };
}

export type PixKind = 'cnpj' | 'cpf' | 'email' | 'phone' | 'random';

/** The team's free-text key type ("CNPJ", "e-mail", "aleatória") → a known kind, or null. */
export function pixKind(type: string | null | undefined): PixKind | null {
  const v = (type ?? '').toLowerCase();
  if (!v) return null;
  if (v.includes('cnpj')) return 'cnpj';
  if (v.includes('cpf')) return 'cpf';
  if (v.includes('mail')) return 'email';
  if (/(phone|telefone|celular|fone)/.test(v)) return 'phone';
  if (/(random|aleat|evp|chave)/.test(v)) return 'random';
  return null;
}

/** CNPJ or CPF by its number of digits. */
export function documentKind(doc: string): 'cnpj' | 'cpf' | null {
  const digits = doc.replace(/\D/g, '').length;
  return digits === 14 ? 'cnpj' : digits === 11 ? 'cpf' : null;
}
