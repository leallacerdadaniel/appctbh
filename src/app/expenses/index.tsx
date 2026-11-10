import { router } from 'expo-router';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { DateBlock, PersonName } from '@/components/expense-ui';
import { Icon } from '@/components/icon';
import { Screen, Section } from '@/components/screen';
import { AppText, Avatar, Button, Card, LoadingState, PressableScale, RetryCard } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import {
  allDebts,
  formerPeople,
  myBalances,
  paymentLabel,
  personLabel,
  useExpenses,
  type Debt,
  type ExpensesData,
} from '@/lib/expenses';
import { formatCents } from '@/lib/format';

/**
 * Shared expenses: my balance per currency, each roommate's balance with me, and the activity by month.
 * A roommate who left stays in the list, marked "(parti·e)", for as long as there is something to settle with them.
 */
export default function ExpensesScreen() {
  const { t } = useI18n();
  const { state, reload } = useExpenses();

  return (
    <Screen back title={t.expenses.title} subtitle={t.expenses.subtitle} onRefresh={reload}>
      {state.status === 'ready' ? (
        <Content data={state.data} />
      ) : state.status === 'error' ? (
        <RetryCard message={t.expenses.unavailable} retryLabel={t.expenses.retry} onRetry={reload} />
      ) : (
        <LoadingState label={t.common.loading} />
      )}
    </Screen>
  );
}

function Content({ data }: { data: ExpensesData }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const money = (c: number, cur: Debt['currency']) => formatCents(c, lang, cur);

  const mine = myBalances(data);
  const debts = allDebts(data);
  const withMe = (cp: string) =>
    debts.filter((d) => (d.from === cp && d.to === data.me) || (d.to === cp && d.from === data.me));
  // The roommates of today, then the ones who left and still owe or are owed something by the student.
  const roommates = [
    ...data.members.filter((m) => m.id !== data.me),
    ...formerPeople(data).filter((m) => withMe(m.id).length > 0),
  ];

  const activity = [
    ...data.expenses.map((e) => ({ kind: 'expense' as const, date: e.spentOn, at: e.createdAt, e })),
    ...data.settlements.map((s) => ({ kind: 'settlement' as const, date: s.paidOn, at: s.createdAt, s })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.at.localeCompare(a.at));
  const months = groupByMonth(activity, lang);

  return (
    <>
      <Card style={styles.summary}>
        <View style={{ gap: 2 }}>
          <AppText variant="caption" color={theme.textSecondary}>
            {t.expenses.yourBalance}
          </AppText>
          {mine.length === 0 ? (
            <View style={styles.settledRow}>
              <Icon name="check" size={20} color={theme.success} />
              <AppText variant="display">{t.expenses.settled}</AppText>
            </View>
          ) : (
            mine.map((b) => (
              <AppText key={b.currency} variant="display" color={b.cents > 0 ? theme.success : theme.text}>
                {b.cents > 0
                  ? t.expenses.youAreOwed(money(b.cents, b.currency))
                  : t.expenses.youOwe(money(-b.cents, b.currency))}
              </AppText>
            ))
          )}
        </View>

        {roommates.length > 0 && (
          <View style={[styles.roommates, { borderTopColor: theme.line }]}>
            {roommates.map((m) => {
              const open = withMe(m.id);
              return (
                <View key={m.id} style={styles.roommate}>
                  <Avatar initials={m.initials} size={40} />
                  <View style={{ flex: 1 }}>
                    <PersonName data={data} cp={m.id} style={{ fontFamily: Fonts.bodyMedium }} />
                    {open.length === 0 ? (
                      <AppText variant="callout" color={theme.textSecondary}>
                        {t.expenses.upToDate}
                      </AppText>
                    ) : (
                      open.map((d) => (
                        <AppText
                          key={d.currency}
                          variant="callout"
                          color={d.to === data.me ? theme.success : theme.textSecondary}>
                          {d.to === data.me
                            ? t.expenses.owesYouShort(money(d.amountCents, d.currency))
                            : t.expenses.youOweShort(money(d.amountCents, d.currency))}
                        </AppText>
                      ))
                    )}
                  </View>
                  {open.length > 0 && (
                    <PressableScale
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: '/expenses/settle',
                          params: {
                            from: open[0].from,
                            to: open[0].to,
                            amount: String(open[0].amountCents),
                            currency: open[0].currency,
                          },
                        })
                      }
                      style={[styles.pill, { backgroundColor: theme.fill }]}>
                      <AppText variant="callout" style={{ fontFamily: Fonts.bodyMedium }}>
                        {t.expenses.settle}
                      </AppText>
                    </PressableScale>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Button label={t.expenses.add} onPress={() => router.push('/expenses/edit')} />
      </Card>

      {months.length === 0 ? (
        <Section title={t.expenses.activity}>
          <Card>
            <AppText color={theme.textSecondary}>{t.expenses.empty}</AppText>
          </Card>
        </Section>
      ) : (
        months.map((month) => (
          <Section key={month.key} title={month.label}>
            <Card style={styles.list}>
              {month.items.map((a, i) => (
                <Fragment key={a.kind === 'expense' ? a.e.id : a.s.id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: theme.line }]} />}
                  {a.kind === 'expense' ? (
                    <ActivityRow
                      date={a.e.spentOn}
                      title={a.e.description}
                      subtitle={
                        a.e.paidBy === data.me
                          ? t.expenses.youPaidAmount(money(a.e.amountCents, a.e.currency))
                          : t.expenses.paidAmount(
                              personLabel(data, a.e.paidBy, t.expenses),
                              money(a.e.amountCents, a.e.currency),
                            )
                      }
                      {...myPart(a.e)}
                      onPress={() =>
                        router.push({ pathname: '/expenses/[id]', params: { id: a.e.id, kind: 'expense' } })
                      }
                    />
                  ) : (
                    <ActivityRow
                      date={a.s.paidOn}
                      title={paymentLabel(data, a.s.from, a.s.to, t.expenses)}
                      subtitle={t.expenses.paymentRow}
                      tag=""
                      amount={money(a.s.amountCents, a.s.currency)}
                      tone="neutral"
                      onPress={() =>
                        router.push({ pathname: '/expenses/[id]', params: { id: a.s.id, kind: 'settlement' } })
                      }
                    />
                  )}
                </Fragment>
              ))}
            </Card>
          </Section>
        ))
      )}
    </>
  );

  /** What the expense means for me: lent (paid for others), borrowed (my share), or not involved. */
  function myPart(e: ExpensesData['expenses'][number]) {
    const share = e.shares.find((s) => s.cp === data.me)?.amountCents ?? 0;
    if (e.paidBy === data.me) {
      const lent = e.amountCents - share;
      return lent > 0
        ? { tag: t.expenses.lent, amount: money(lent, e.currency), tone: 'positive' as const }
        : { tag: t.expenses.notConcerned, amount: '', tone: 'neutral' as const };
    }
    return share > 0
      ? { tag: t.expenses.borrowed, amount: money(share, e.currency), tone: 'negative' as const }
      : { tag: t.expenses.notConcerned, amount: '', tone: 'neutral' as const };
  }
}

/** One line of the activity: date block, what and who, and on the right what it means for me. */
function ActivityRow({
  date,
  title,
  subtitle,
  tag,
  amount,
  tone,
  onPress,
}: {
  date: string;
  title: string;
  subtitle: string;
  tag: string;
  amount: string;
  tone: 'positive' | 'negative' | 'neutral';
  onPress: () => void;
}) {
  const theme = useTheme();
  const { lang } = useI18n();
  const color = tone === 'positive' ? theme.success : tone === 'negative' ? theme.text : theme.textSecondary;
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} style={styles.row}>
      <DateBlock iso={date} lang={lang} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText>{title}</AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {subtitle}
        </AppText>
      </View>
      <View style={styles.rowRight}>
        {tag ? (
          <AppText variant="caption" color={color} style={{ textAlign: 'right' }}>
            {tag}
          </AppText>
        ) : null}
        {amount ? (
          <AppText color={color} style={{ fontFamily: Fonts.bodyMedium, textAlign: 'right' }}>
            {amount}
          </AppText>
        ) : null}
      </View>
    </PressableScale>
  );
}

function groupByMonth<T extends { date: string }>(items: T[], lang: 'fr' | 'en') {
  const months: { key: string; label: string; items: T[] }[] = [];
  for (const item of items) {
    const key = item.date.slice(0, 7);
    let month = months.at(-1);
    if (month?.key !== key) {
      const [y, m] = key.split('-').map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
        month: 'long',
        year: 'numeric',
      });
      month = { key, label: label.charAt(0).toUpperCase() + label.slice(1), items: [] };
      months.push(month);
    }
    month.items.push(item);
  }
  return months;
}

const styles = StyleSheet.create({
  summary: { gap: Spacing.md },
  settledRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  roommates: { gap: Spacing.md, paddingTop: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  roommate: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  list: { paddingVertical: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm + 2 },
  rowRight: { alignItems: 'flex-end', maxWidth: '38%' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 44 + Spacing.md },
});
