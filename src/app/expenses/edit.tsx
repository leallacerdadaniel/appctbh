import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AmountField, PersonPicker } from '@/components/expense-ui';
import { MonthGrid } from '@/components/month-grid';
import { Screen, Section } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { useToast } from '@/components/toast';
import { AppText, Avatar, Button, Card, Chip, InlineMessage, Input } from '@/components/ui';
import { Fonts, Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { parseIso, toIso } from '@/lib/events';
import {
  centsToInput,
  parseCents,
  splitEqual,
  useExpenseAction,
  useExpenses,
  type Currency,
  type ExpensesData,
} from '@/lib/expenses';
import { formatCents, formatShortDate } from '@/lib/format';
import { trackAction } from '@/lib/usage';
import { hasLink } from '@/lib/no-links';

/** New expense, or edit one (?id=) that the student added. */
export default function ExpenseFormScreen() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state } = useExpenses();
  return (
    <Screen back title={id ? t.expenses.editTitle : t.expenses.newTitle}>
      {state.status === 'ready' && <Form data={state.data} id={id} />}
    </Screen>
  );
}

function Form({ data, id }: { data: ExpensesData; id?: string }) {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const act = useExpenseAction();
  const existing = id ? data.expenses.find((e) => e.id === id) : undefined;

  const [{ today, yesterday }] = useState(() => {
    const now = new Date();
    return { today: toIso(now), yesterday: toIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)) };
  });
  const everyone = data.members.map((m) => m.id);
  // The student first, then the roommates (same order as the pickers).
  const ordered = [data.me, ...everyone.filter((cp) => cp !== data.me)];

  const [description, setDescription] = useState(existing?.description ?? '');
  const [amount, setAmount] = useState(existing ? centsToInput(existing.amountCents) : '');
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? 'BRL');
  const [date, setDate] = useState(existing?.spentOn ?? today);
  // "Autre date": an inline month calendar, opened on the month of the chosen date.
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const d = parseIso(existing?.spentOn ?? today);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [paidBy, setPaidBy] = useState(existing?.paidBy ?? data.me);
  const [mode, setMode] = useState<'equal' | 'exact'>(existing?.splitMode ?? 'equal');
  const [people, setPeople] = useState<string[]>(
    existing ? existing.shares.filter((s) => s.amountCents > 0).map((s) => s.cp) : everyone,
  );
  const [exact, setExact] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      everyone.map((cp) => {
        const s = existing?.shares.find((x) => x.cp === cp);
        return [cp, s && s.amountCents > 0 ? centsToInput(s.amountCents) : ''];
      }),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cents = parseCents(amount);
  const money = (c: number) => formatCents(c, lang, currency);
  const member = (cp: string) => data.members.find((m) => m.id === cp);
  const exactSum = everyone.reduce((sum, cp) => sum + (parseCents(exact[cp] ?? '') ?? 0), 0);
  const dates = [today, yesterday, ...(date !== today && date !== yesterday ? [date] : [])];

  // Equal split preview: "R$ 5,00 par personne", or "R$ 5,00 – R$ 5,01" when the centavos don't divide.
  const perPerson = cents && people.length > 0 ? splitEqual(cents, people).map((s) => s.amountCents) : [];
  const perPersonLabel =
    perPerson.length === 0
      ? ''
      : Math.min(...perPerson) === Math.max(...perPerson)
        ? money(perPerson[0])
        : `${money(Math.min(...perPerson))} – ${money(Math.max(...perPerson))}`;

  async function save() {
    setError(null);
    if (!cents) return setError(t.expenses.errors.amount);
    if (!description.trim()) return setError(t.expenses.errors.description);
    if (hasLink(description)) return setError(t.common.noLinks);
    let shares;
    if (mode === 'equal') {
      if (people.length === 0) return setError(t.expenses.errors.people);
      shares = splitEqual(cents, ordered.filter((cp) => people.includes(cp)));
    } else {
      shares = everyone
        .map((cp) => ({ cp, amountCents: parseCents(exact[cp] ?? '') ?? 0 }))
        .filter((s) => s.amountCents > 0);
      if (shares.length === 0) return setError(t.expenses.errors.people);
      if (exactSum !== cents) return setError(t.expenses.errors.sum);
    }
    setSaving(true);
    try {
      await act('expense-save', {
        id,
        description: description.trim(),
        amountCents: cents,
        currency,
        paidBy,
        spentOn: date,
        splitMode: mode,
        shares,
      });
      if (!id) trackAction('expense_added');
      toast(t.expenses.saved);
      router.back();
    } catch {
      setError(t.expenses.errors.server);
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirmDelete) return setConfirmDelete(true);
    setSaving(true);
    try {
      await act('expense-delete', { id });
      toast(t.expenses.deleted);
      router.dismissTo('/expenses');
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
        <Input
          label={t.expenses.description}
          placeholder={t.expenses.descriptionPlaceholder}
          value={description}
          onChangeText={setDescription}
          maxLength={80}
        />
        <View style={styles.chips}>
          {dates.map((d) => (
            <Chip
              key={d}
              label={d === today ? t.expenses.today : d === yesterday ? t.expenses.yesterday : formatShortDate(d, lang)}
              selected={date === d && !calendarOpen}
              onPress={() => {
                setDate(d);
                setCalendarOpen(false);
              }}
            />
          ))}
          <Chip label={t.expenses.otherDate} selected={calendarOpen} onPress={() => setCalendarOpen((o) => !o)} />
        </View>
        {calendarOpen && (
          <MonthGrid
            month={month}
            monthLabel={month.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' })}
            todayIso={today}
            selectedIso={date}
            kindsByDate={NO_EVENTS}
            weekStartsOn={t.calendar.weekStartsOn}
            weekdaysShort={t.calendar.weekdaysShort}
            prevLabel={t.calendar.previousMonth}
            nextLabel={t.calendar.nextMonth}
            onSelect={(iso) => {
              setDate(iso);
              setCalendarOpen(false);
            }}
            onPrev={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            onNext={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          />
        )}
      </Card>

      <Section title={t.expenses.whoPaid}>
        <Card>
          <PersonPicker
            members={data.members}
            me={data.me}
            meLabel={t.expenses.youCap}
            selected={[paidBy]}
            onPress={setPaidBy}
          />
        </Card>
      </Section>

      <Section title={t.expenses.split}>
        <SegmentedControl
          options={[
            { value: 'equal', label: t.expenses.splitEqual },
            { value: 'exact', label: t.expenses.splitExact },
          ]}
          value={mode}
          onChange={setMode}
        />
        {mode === 'equal' ? (
          <Card style={{ gap: Spacing.md }}>
            <PersonPicker
              members={data.members}
              me={data.me}
              meLabel={t.expenses.youCap}
              selected={people}
              onPress={(cp) => setPeople((p) => (p.includes(cp) ? p.filter((x) => x !== cp) : [...p, cp]))}
            />
            {perPersonLabel ? (
              <AppText variant="callout" color={theme.textSecondary}>
                {t.expenses.perPerson(perPersonLabel)}
              </AppText>
            ) : null}
          </Card>
        ) : (
          <Card style={{ gap: Spacing.md }}>
            {ordered.map((cp) => {
              const m = member(cp);
              return (
                <View key={cp} style={styles.exactRow}>
                  <Avatar initials={m?.initials ?? '?'} size={36} />
                  <AppText style={{ flex: 1 }}>{cp === data.me ? t.expenses.youCap : m?.fullName}</AppText>
                  <TextInput
                    accessibilityLabel={cp === data.me ? t.expenses.youCap : m?.fullName}
                    value={exact[cp] ?? ''}
                    onChangeText={(v) => setExact((x) => ({ ...x, [cp]: v }))}
                    placeholder={t.expenses.amountPlaceholder}
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    style={[styles.exactInput, Type.body, { color: theme.text, backgroundColor: theme.fill }]}
                  />
                </View>
              );
            })}
            {cents ? (
              <AppText
                variant="callout"
                color={exactSum === cents ? theme.success : theme.textSecondary}
                style={{ fontFamily: exactSum === cents ? Fonts.bodyMedium : Fonts.body }}>
                {exactSum <= cents ? t.expenses.remaining(money(cents - exactSum)) : t.expenses.over(money(exactSum - cents))}
              </AppText>
            ) : null}
          </Card>
        )}
      </Section>

      {error && <InlineMessage kind="error" text={error} />}
      <View style={{ gap: Spacing.sm }}>
        <Button label={t.expenses.save} onPress={save} loading={saving} />
        {existing && existing.createdBy === data.me && (
          <Button
            variant="secondary"
            label={confirmDelete ? t.expenses.confirmDelete : t.expenses.delete}
            onPress={remove}
            disabled={saving}
          />
        )}
      </View>
    </>
  );
}

const NO_EVENTS = new Map();

const styles = StyleSheet.create({
  hero: { gap: Spacing.lg, paddingTop: Spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  exactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  exactInput: { width: 104, height: 40, borderRadius: Radius.sm, paddingHorizontal: 12, textAlign: 'right' },
});
