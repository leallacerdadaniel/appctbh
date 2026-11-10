import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PersonName } from '@/components/expense-ui';
import { Icon } from '@/components/icon';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Avatar, Button, Card, InlineMessage, LoadingState, RetryCard } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatLongDate } from '@/lib/cleaning';
import { findPerson, involvesFormer, personLabel, useExpenseAction, useExpenses } from '@/lib/expenses';
import { formatCents } from '@/lib/format';

/**
 * One expense (with each roommate's share) or one payment. Only its author can edit or delete it; an expense that
 * involves a roommate who has left can only be deleted (the form only offers the people living there now).
 */
export default function ExpenseDetailScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { id, kind } = useLocalSearchParams<{ id: string; kind: 'expense' | 'settlement' }>();
  const { state, reload } = useExpenses();
  const act = useExpenseAction();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const data = state.status === 'ready' ? state.data : null;
  const expense = data && kind === 'expense' ? data.expenses.find((e) => e.id === id) : undefined;
  const payment = data && kind === 'settlement' ? data.settlements.find((s) => s.id === id) : undefined;
  const item = expense ?? payment;
  // Not loaded yet, failed to load, or deleted meanwhile (the list no longer has it).
  if (!data || !item) {
    return (
      <Screen back title={t.expenses.detailTitle}>
        {state.status === 'loading' ? (
          <LoadingState label={t.common.loading} />
        ) : state.status === 'error' ? (
          <RetryCard message={t.expenses.unavailable} retryLabel={t.expenses.retry} onRetry={reload} />
        ) : (
          <Card>
            <AppText color={theme.textSecondary}>{t.expenses.notFound}</AppText>
          </Card>
        )}
      </Screen>
    );
  }

  const initials = (cp: string) => findPerson(data, cp)?.initials ?? '?';
  const name = (cp: string) => personLabel(data, cp, t.expenses, 'fullName');
  const frozen = !!expense && involvesFormer(data, expense);
  const money = (c: number) => formatCents(c, lang, item.currency);
  const day = capitalize(formatLongDate(expense ? expense.spentOn : payment!.paidOn, lang));
  const mine = item.createdBy === data.me;

  async function remove() {
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy(true);
    try {
      await act(expense ? 'expense-delete' : 'settlement-delete', { id });
      toast(t.expenses.deleted);
      router.back();
    } catch {
      setError(t.expenses.errors.server);
      setBusy(false);
    }
  }

  return (
    <Screen back title={expense ? t.expenses.detailTitle : t.expenses.paymentDetail}>
      <Card style={styles.hero}>
        <AppText variant="caption" color={theme.textSecondary}>
          {day}
        </AppText>
        <AppText style={styles.amount}>{money(item.amountCents)}</AppText>
        {expense ? (
          <>
            <AppText variant="title" style={{ textAlign: 'center' }}>
              {expense.description}
            </AppText>
            <View style={styles.payer}>
              <Avatar initials={initials(expense.paidBy)} size={28} />
              <AppText variant="callout" color={theme.textSecondary} style={{ flexShrink: 1 }}>
                {expense.paidBy === data.me ? t.expenses.paidByYou : t.expenses.paidBy(name(expense.paidBy))}
              </AppText>
            </View>
          </>
        ) : (
          <View style={styles.transfer}>
            <View style={styles.party}>
              <Avatar initials={initials(payment!.from)} size={48} />
              <PersonName data={data} cp={payment!.from} full variant="caption" style={{ textAlign: 'center' }} />
            </View>
            <Icon name="chevronRight" size={20} color={theme.textTertiary} />
            <View style={styles.party}>
              <Avatar initials={initials(payment!.to)} size={48} />
              <PersonName data={data} cp={payment!.to} full variant="caption" style={{ textAlign: 'center' }} />
            </View>
          </View>
        )}
      </Card>

      {expense && (
        <Section title={t.expenses.shares}>
          <Card style={{ paddingVertical: Spacing.xs }}>
            {expense.shares
              .filter((s) => s.amountCents > 0)
              .map((s, i) => (
                <Fragment key={s.cp}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: theme.line }]} />}
                  <View style={styles.share}>
                    <Avatar initials={initials(s.cp)} size={36} />
                    <PersonName data={data} cp={s.cp} full style={{ flex: 1 }} />
                    <AppText style={{ fontFamily: Fonts.bodyMedium }}>{money(s.amountCents)}</AppText>
                  </View>
                </Fragment>
              ))}
          </Card>
        </Section>
      )}

      <AppText variant="caption" color={theme.textSecondary}>
        {mine ? t.expenses.addedByYou : t.expenses.addedBy(name(item.createdBy))}
      </AppText>

      {error && <InlineMessage kind="error" text={error} />}
      {mine ? (
        <View style={{ gap: Spacing.sm }}>
          {expense && !frozen && (
            <Button
              label={t.expenses.editTitle}
              onPress={() => router.push({ pathname: '/expenses/edit', params: { id: expense.id } })}
            />
          )}
          {frozen && (
            <AppText variant="callout" color={theme.textSecondary}>
              {t.expenses.formerNoEdit}
            </AppText>
          )}
          <Button
            variant="secondary"
            label={confirmDelete ? t.expenses.confirmDelete : t.expenses.delete}
            onPress={remove}
            loading={busy}
          />
        </View>
      ) : (
        <AppText variant="callout" color={theme.textSecondary}>
          {t.expenses.onlyAuthor}
        </AppText>
      )}
    </Screen>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  amount: { fontFamily: Fonts.display, fontSize: 40, lineHeight: 48 },
  payer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  transfer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginTop: Spacing.sm },
  party: { alignItems: 'center', gap: 6, maxWidth: 120 },
  share: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm + 2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 36 + Spacing.md },
});
