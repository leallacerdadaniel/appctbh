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
import { toIso } from '@/lib/events';
import { centsToInput, parseCents, useExpenseAction, useExpenses, type Currency } from '@/lib/expenses';
import { trackAction } from '@/lib/usage';

/**
 * Records "A paid B" (the Pix happens outside the app). Prefilled from a roommate's balance.
 * The student is always one of the two: picking someone else as payer makes the student the receiver.
 */
export default function SettleScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ from?: string; to?: string; amount?: string; currency?: Currency }>();
  const { state } = useExpenses();
  const act = useExpenseAction();

  const me = state.status === 'ready' ? state.data.me : '';
  const members = state.status === 'ready' ? state.data.members : [];
  const others = members.map((m) => m.id).filter((cp) => cp !== me);
  const [from, setFrom] = useState(params.from ?? me);
  const [to, setTo] = useState(params.to ?? others[0] ?? '');
  const [amount, setAmount] = useState(params.amount ? centsToInput(Number(params.amount)) : '');
  const [currency, setCurrency] = useState<Currency>(params.currency === 'EUR' ? 'EUR' : 'BRL');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const label = (cp: string) =>
    cp === me ? t.expenses.youCap : (members.find((m) => m.id === cp)?.firstName ?? '?');

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
      await act('settlement-save', { from, to, amountCents: cents, currency, paidOn: toIso(new Date()) });
      trackAction('settlement_added');
      toast(t.expenses.saved);
      router.back();
    } catch {
      setError(t.expenses.errors.server);
      setSaving(false);
    }
  }

  return (
    <Screen back title={t.expenses.settleTitle} subtitle={t.expenses.settleHint}>
      {state.status === 'ready' && (
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
            <AppText variant="callout" color={theme.textSecondary} style={{ textAlign: 'center' }}>
              {t.expenses.payment(label(from), label(to))}
            </AppText>
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
          <Button label={t.expenses.settleSave} onPress={save} loading={saving} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: Spacing.md, paddingVertical: Spacing.lg },
});
