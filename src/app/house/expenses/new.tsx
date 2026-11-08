import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen, Section } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, Chip, InlineMessage, Input } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatShortDate } from '@/lib/format';
import {
  EXPENSE_CATEGORIES,
  formatMoney,
  fromCents,
  isExpenseCategory,
  parseMoney,
  splitEqually,
  toCents,
} from '@/lib/house';
import { addExpense } from '@/store/actions';
import { addDays, isoDate } from '@/store/dates';
import { me, roommates } from '@/store/selectors';
import type { Expense, ExpenseSplit, ID } from '@/store/types';

type SplitMode = 'equal' | 'exact';

const ME = me().id;
const residents = [me(), ...roommates()];

export default function NewExpenseScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const toast = useToast();
  const params = useLocalSearchParams<{ category?: string; title?: string }>();

  const [title, setTitle] = useState(typeof params.title === 'string' ? params.title : '');
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<Expense['category']>(
    isExpenseCategory(params.category) ? params.category : 'groceries',
  );
  const [paidBy, setPaidBy] = useState<ID>(ME);
  const [daysAgo, setDaysAgo] = useState(0);
  const [mode, setMode] = useState<SplitMode>('equal');
  const [between, setBetween] = useState<ID[]>(residents.map((r) => r.id));
  const [exact, setExact] = useState<Record<ID, string>>({});
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);

  const money = (v: number) => formatMoney(v, lang);
  const nameOf = (id: ID) =>
    id === ME ? t.expenses.you : (residents.find((r) => r.id === id)?.firstName ?? '?');

  const amount = parseMoney(amountText);
  const validAmount = amount !== null && amount > 0 ? amount : null;

  const dateOptions = useMemo(() => {
    const today = new Date();
    return [0, 1, 2, 3, 4, 5, 6].map((n) => {
      const d = addDays(today, -n);
      const iso = isoDate(d);
      const label =
        n === 0
          ? t.expenses.today
          : n === 1
            ? t.expenses.yesterday
            : `${d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short' })} ${formatShortDate(iso, lang)}`;
      return { n, iso, label };
    });
  }, [lang, t]);

  /* Exact mode: what is left to split, in cents (negative = too much). */
  const exactParsed = residents.map((r) => {
    const raw = (exact[r.id] ?? '').trim();
    return { id: r.id, raw, value: raw ? parseMoney(raw) : 0 };
  });
  const exactInvalid = exactParsed.some((p) => p.value === null);
  const exactCents = exactParsed.reduce((sum, p) => sum + toCents(p.value ?? 0), 0);
  const remainingCents = validAmount !== null ? toCents(validAmount) - exactCents : null;

  const errors = {
    title: title.trim() ? undefined : t.expenses.errTitle,
    amount: validAmount !== null ? undefined : t.expenses.errAmount,
    split:
      mode === 'equal'
        ? between.length === 0
          ? t.expenses.errPeople
          : undefined
        : exactInvalid
          ? t.expenses.errExactAmount
          : validAmount !== null && remainingCents !== 0
            ? t.expenses.errSum(money(validAmount))
            : undefined,
  };
  const firstError = errors.title ?? errors.amount ?? errors.split;

  function toggleBetween(id: ID) {
    setBetween((list) =>
      list.includes(id) ? list.filter((x) => x !== id) : residents.map((r) => r.id).filter((x) => x === id || list.includes(x)),
    );
  }

  async function save() {
    setTried(true);
    if (firstError || validAmount === null) return;
    const split: ExpenseSplit[] =
      mode === 'equal'
        ? splitEqually(validAmount, between, paidBy)
        : exactParsed
            .filter((p) => (p.value ?? 0) > 0)
            .map((p) => ({ residentId: p.id, amountBrl: fromCents(toCents(p.value ?? 0)) }));
    setSaving(true);
    try {
      await addExpense({
        title: title.trim(),
        category,
        amountBrl: validAmount,
        paidBy,
        date: dateOptions[daysAgo].iso,
        split,
      });
      toast(t.expenses.saved);
      router.back();
    } catch {
      toast(t.expenses.error);
      setSaving(false);
    }
  }

  return (
    <Screen back title={t.expenses.newTitle} subtitle={t.expenses.newSubtitle}>
      <Card style={{ gap: Spacing.lg, padding: Spacing.lg }}>
        <Input
          label={t.expenses.titleLabel}
          placeholder={t.expenses.titlePlaceholder}
          value={title}
          onChangeText={setTitle}
          error={tried ? errors.title : undefined}
          returnKeyType="next"
        />
        <Input
          label={t.expenses.amountLabel}
          placeholder={t.expenses.amountPlaceholder}
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="decimal-pad"
          inputMode="decimal"
          error={tried ? errors.amount : undefined}
        />
      </Card>

      <Section title={t.expenses.category}>
        <View style={styles.chips}>
          {EXPENSE_CATEGORIES.map((c) => (
            <Chip key={c} label={t.expenses.categories[c]} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>
      </Section>

      <Section title={t.expenses.paidByLabel}>
        <View style={styles.chips}>
          {residents.map((r) => (
            <Chip key={r.id} label={nameOf(r.id)} selected={paidBy === r.id} onPress={() => setPaidBy(r.id)} />
          ))}
        </View>
      </Section>

      <Section title={t.expenses.date}>
        <View style={styles.chips}>
          {dateOptions.map((o) => (
            <Chip key={o.iso} label={o.label} selected={daysAgo === o.n} onPress={() => setDaysAgo(o.n)} />
          ))}
        </View>
      </Section>

      <Section title={t.expenses.splitMode}>
        <SegmentedControl<SplitMode>
          options={[
            { value: 'equal', label: t.expenses.splitEqual },
            { value: 'exact', label: t.expenses.splitExact },
          ]}
          value={mode}
          onChange={setMode}
        />
        {mode === 'equal' ? (
          <Card style={{ gap: Spacing.md, padding: Spacing.lg }}>
            <AppText variant="callout" color={theme.textSecondary}>
              {t.expenses.splitBetween}
            </AppText>
            <View style={styles.chips}>
              {residents.map((r) => (
                <Chip
                  key={r.id}
                  label={nameOf(r.id)}
                  selected={between.includes(r.id)}
                  onPress={() => toggleBetween(r.id)}
                />
              ))}
            </View>
            {validAmount !== null && between.length > 0 && (
              <AppText variant="callout">
                {t.expenses.perPerson(money(fromCents(Math.floor(toCents(validAmount) / between.length))))}
              </AppText>
            )}
          </Card>
        ) : (
          <Card style={{ gap: Spacing.md, padding: Spacing.lg }}>
            {residents.map((r) => (
              <Input
                key={r.id}
                label={nameOf(r.id)}
                placeholder={t.expenses.amountPlaceholder}
                value={exact[r.id] ?? ''}
                onChangeText={(v) => setExact((m) => ({ ...m, [r.id]: v }))}
                keyboardType="decimal-pad"
                inputMode="decimal"
              />
            ))}
            {remainingCents !== null && !exactInvalid && (
              <AppText
                variant="callout"
                color={remainingCents === 0 ? theme.success : theme.textSecondary}>
                {remainingCents === 0
                  ? t.expenses.balanced
                  : remainingCents > 0
                    ? t.expenses.remaining(money(fromCents(remainingCents)))
                    : t.expenses.tooMuch(money(fromCents(-remainingCents)))}
              </AppText>
            )}
          </Card>
        )}
      </Section>

      <View style={{ gap: Spacing.md }}>
        {tried && firstError && <InlineMessage kind="error" text={firstError} />}
        <Button label={t.expenses.save} loading={saving} onPress={save} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
