import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { AmountField, PersonPicker } from '@/components/expense-ui';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, InlineMessage } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { bhToday } from '@/lib/bh-time';
import {
  centsToInput,
  CURRENCIES,
  formerPeople,
  netBalances,
  parseCents,
  paymentLabel,
  useExpenseAction,
  useExpenses,
  type Currency,
  type ExpensesData,
} from '@/lib/expenses';
import { textParam } from '@/lib/params';
import { trackAction } from '@/lib/usage';

/**
 * Records "A paid B" (the Pix happens outside the app). Prefilled from a roommate's balance.
 * The student is always one of the two: picking someone else as payer makes the student the receiver.
 * A roommate who left can still be paid back (or pay back): they are offered while their balance is open.
 */
export default function SettleScreen() {
  const { t } = useI18n();
  const { state } = useExpenses();
  return (
    <Screen back title={t.expenses.settleTitle} subtitle={t.expenses.settleHint}>
      {state.status === 'ready' && <Form data={state.data} />}
    </Screen>
  );
}

function Form({ data }: { data: ExpensesData }) {
  const theme = useTheme();
  const toast = useToast();
  const { t } = useI18n();
  // A link can repeat a parameter (it then arrives as a list): only plain text is read.
  const raw = useLocalSearchParams<{ from?: string; to?: string; amount?: string; currency?: string }>();
  const params = { from: textParam(raw.from), to: textParam(raw.to), amount: textParam(raw.amount) };
  const act = useExpenseAction();

  const { me } = data;
  // Today's roommates, then the ones who left and still have a balance (or the one this screen was opened for).
  const members = [
    ...data.members,
    ...formerPeople(data).filter(
      (m) =>
        m.id === params.from ||
        m.id === params.to ||
        CURRENCIES.some((currency) => (netBalances(data, currency).get(m.id) ?? 0) !== 0),
    ),
  ];
  const known = (cp: string) => members.some((m) => m.id === cp);
  const others = members.map((m) => m.id).filter((cp) => cp !== me);
  const [from, setFrom] = useState(known(params.from) ? params.from : me);
  const [to, setTo] = useState(
    known(params.to) && params.to !== from ? params.to : from !== me ? me : (others[0] ?? ''),
  );
  const [amount, setAmount] = useState(Number(params.amount) > 0 ? centsToInput(Number(params.amount)) : '');
  const [currency, setCurrency] = useState<Currency>(raw.currency === 'EUR' ? 'EUR' : 'BRL');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function pickFrom(cp: string) {
    setFrom(cp);
    if (cp !== me) setTo(me);
    else if (to === me) setTo(others[0] ?? '');
  }

  function pickTo(cp: string) {
    setTo(cp);
    if (cp !== me) setFrom(me);
    else if (from === me) setFrom(others[0] ?? '');
  }

  async function save() {
    setError(null);
    const cents = parseCents(amount);
    if (!cents) return setError(t.expenses.errors.amount);
    setSaving(true);
    try {
      // The day in Belo Horizonte, like the rest of the house (a phone on Paris time is already tomorrow at night).
      await act('settlement-save', { from, to, amountCents: cents, currency, paidOn: bhToday() });
      trackAction('settlement_added');
      toast(t.expenses.saved);
      router.back();
    } catch {
      setError(t.expenses.errors.server);
      setSaving(false);
    }
  }

  return (
    <>
      <Card style={styles.hero}>
        <AmountField
          label={t.expenses.amount}
          value={amount}
          onChangeText={setAmount}
          currency={currency}
          onCurrencyChange={setCurrency}
          placeholder={t.expenses.amountPlaceholder}
        />
        {to ? (
          <AppText variant="callout" color={theme.textSecondary} style={{ textAlign: 'center' }}>
            {paymentLabel(data, from, to, t.expenses)}
          </AppText>
        ) : null}
      </Card>
      <Section title={t.expenses.whoPays}>
        <Card>
          <PersonPicker members={members} me={me} meLabel={t.expenses.youCap} selected={[from]} onPress={pickFrom} />
        </Card>
      </Section>
      <Section title={t.expenses.toWhom}>
        <Card>
          <PersonPicker
            members={members.filter((m) => m.id !== from)}
            me={me}
            meLabel={t.expenses.youCap}
            selected={[to]}
            onPress={pickTo}
          />
        </Card>
      </Section>
      {error && <InlineMessage kind="error" text={error} />}
      <Button label={t.expenses.settleSave} onPress={save} loading={saving} disabled={!to} />
    </>
  );
}

const styles = StyleSheet.create({
  hero: { gap: Spacing.md, paddingVertical: Spacing.lg },
});
