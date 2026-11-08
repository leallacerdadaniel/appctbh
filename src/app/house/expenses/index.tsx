import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Avatar, Button, Card, PressableScale } from '@/components/ui';
import { Fonts, Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatShortDate } from '@/lib/format';
import { formatMoney, houseHref, shareOf } from '@/lib/house';
import { useStore } from '@/store';
import { deleteExpense, settleUp } from '@/store/actions';
import { todayIso } from '@/store/dates';
import { balances, me, residentById, simplifiedDebts } from '@/store/selectors';
import type { Expense, ID } from '@/store/types';

const ME = me().id;

const CATEGORY_ICON: Record<Expense['category'], IconName> = {
  groceries: 'supermarket',
  utilities: 'receipt',
  home: 'home',
  outing: 'party',
  other: 'wallet',
};

export default function ExpensesScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const toast = useToast();
  const myBalance = useStore((s) => balances(s)[ME] ?? 0);
  const debts = useStore(simplifiedDebts);
  const expenses = useStore((s) =>
    [...s.expenses].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
  );
  const [repaying, setRepaying] = useState<string | null>(null);
  const [openId, setOpenId] = useState<ID | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const money = (v: number) => formatMoney(v, lang);
  const nameOf = (id: ID) => (id === ME ? t.expenses.you : (residentById(id)?.firstName ?? '?'));

  async function markPaid(from: ID, to: ID, amount: number) {
    setBusy(true);
    try {
      await settleUp(from, to, amount, todayIso());
      setRepaying(null);
      toast(t.expenses.paidToast);
    } catch {
      toast(t.expenses.error);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: ID) {
    setBusy(true);
    try {
      await deleteExpense(id);
      setOpenId(null);
      setConfirmDelete(false);
      toast(t.expenses.deleted);
    } catch {
      toast(t.expenses.error);
    } finally {
      setBusy(false);
    }
  }

  const balanceTitle =
    myBalance > 0.009
      ? t.expenses.owedToYou(money(myBalance))
      : myBalance < -0.009
        ? t.expenses.youOweTotal(money(-myBalance))
        : t.expenses.allSettled;
  const balanceHint =
    myBalance > 0.009 ? t.expenses.owedHint : myBalance < -0.009 ? t.expenses.oweHint : t.expenses.settledHint;

  return (
    <Screen back title={t.expenses.title} subtitle={t.expenses.subtitle}>
      <View style={{ gap: Spacing.md }}>
        <Card style={{ gap: Spacing.xs, padding: Spacing.lg }}>
          <AppText variant="caption" color={theme.textSecondary}>
            {t.expenses.balanceLabel}
          </AppText>
          <AppText variant="display" color={myBalance > 0.009 ? theme.success : theme.text}>
            {balanceTitle}
          </AppText>
          <AppText variant="callout" color={theme.textSecondary}>
            {balanceHint}
          </AppText>
        </Card>
        <Button
          label={t.expenses.add}
          icon={<Icon name="plus" size={17} color={theme.onBrand} />}
          onPress={() => router.push(houseHref('/house/expenses/new'))}
        />
      </View>

      <Section title={t.expenses.whoOwesWhom} subtitle={t.expenses.whoOwesHint}>
        <Card>
          {debts.length === 0 ? (
            <AppText color={theme.textSecondary} style={{ paddingVertical: Spacing.sm }}>
              {t.expenses.noDebts}
            </AppText>
          ) : (
            <ListGroup>
              {debts.map((d) => {
                const key = `${d.from}-${d.to}`;
                const iOwe = d.from === ME;
                const creditor = residentById(d.to);
                const label = iOwe
                  ? t.expenses.youOwe(nameOf(d.to))
                  : d.to === ME
                    ? t.expenses.owesYou(nameOf(d.from))
                    : t.expenses.owes(nameOf(d.from), nameOf(d.to));
                return (
                  <View key={key} style={styles.debtBlock}>
                    <View style={styles.debtRow}>
                      <Avatar initials={residentById(d.from)?.initials ?? '?'} size={32} />
                      <AppText style={{ flex: 1 }}>{label}</AppText>
                      <AppText style={{ fontFamily: Fonts.bodyMedium }}>{money(d.amountBrl)}</AppText>
                    </View>
                    {iOwe && repaying !== key && (
                      <PressableScale
                        accessibilityRole="button"
                        onPress={() => setRepaying(key)}
                        style={styles.inlineAction}>
                        <Icon name="wallet" size={17} color={theme.brand} />
                        <AppText variant="callout" style={{ fontFamily: Fonts.bodyMedium }}>
                          {t.expenses.repay}
                        </AppText>
                      </PressableScale>
                    )}
                    {iOwe && repaying === key && (
                      <View style={[styles.panel, { backgroundColor: theme.fill }]}>
                        <AppText variant="callout" color={theme.textSecondary}>
                          {t.expenses.repaySteps(money(d.amountBrl), nameOf(d.to))}
                        </AppText>
                        {creditor?.pixKey ? (
                          <View style={styles.pixRow}>
                            <View style={{ flex: 1, gap: 2 }}>
                              <AppText variant="caption" color={theme.textSecondary}>
                                {t.expenses.pixKeyOf(creditor.firstName)}
                              </AppText>
                              <AppText selectable>{creditor.pixKey}</AppText>
                            </View>
                            <PressableScale
                              accessibilityRole="button"
                              accessibilityLabel={`${t.expenses.copy} ${creditor.pixKey}`}
                              onPress={async () => {
                                await Clipboard.setStringAsync(creditor.pixKey ?? '');
                                toast(t.expenses.copied);
                              }}
                              style={styles.inlineAction}>
                              <Icon name="copy" size={17} color={theme.brand} />
                              <AppText variant="callout" style={{ fontFamily: Fonts.bodyMedium }}>
                                {t.expenses.copy}
                              </AppText>
                            </PressableScale>
                          </View>
                        ) : (
                          <AppText variant="callout">{t.expenses.noPixKey}</AppText>
                        )}
                        <Button
                          variant="secondary"
                          label={t.expenses.markPaid}
                          loading={busy}
                          icon={<Icon name="checkCircle" size={17} color={theme.text} />}
                          onPress={() => markPaid(d.from, d.to, d.amountBrl)}
                        />
                        <Button variant="plain" label={t.expenses.cancel} onPress={() => setRepaying(null)} />
                      </View>
                    )}
                  </View>
                );
              })}
            </ListGroup>
          )}
        </Card>
      </Section>

      <Section title={t.expenses.list} subtitle={t.expenses.listHint}>
        <Card>
          {expenses.length === 0 ? (
            <AppText color={theme.textSecondary} style={{ paddingVertical: Spacing.sm }}>
              {t.expenses.empty}
            </AppText>
          ) : (
            <ListGroup inset>
              {expenses.map((e) => {
                const share = shareOf(e, ME);
                const date = formatShortDate(e.date, lang);
                const open = openId === e.id;
                return (
                  <View key={e.id}>
                    <ListRow
                      icon={CATEGORY_ICON[e.category]}
                      title={e.title}
                      subtitle={[
                        e.paidBy === ME ? t.expenses.paidByYou(date) : t.expenses.paidBy(nameOf(e.paidBy), date),
                        share > 0 ? t.expenses.yourShare(money(share)) : t.expenses.notInSplit,
                      ].join('\n')}
                      value={money(e.amountBrl)}
                      accessory={
                        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={15} color={theme.textTertiary} />
                      }
                      onPress={() => {
                        setOpenId(open ? null : e.id);
                        setConfirmDelete(false);
                      }}
                    />
                    {open && (
                      <ExpenseDetail
                        expense={e}
                        nameOf={nameOf}
                        confirming={confirmDelete}
                        busy={busy}
                        onAskDelete={() => setConfirmDelete(true)}
                        onCancelDelete={() => setConfirmDelete(false)}
                        onDelete={() => remove(e.id)}
                      />
                    )}
                  </View>
                );
              })}
            </ListGroup>
          )}
        </Card>
      </Section>
    </Screen>
  );
}

function ExpenseDetail({
  expense,
  nameOf,
  confirming,
  busy,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  expense: Expense;
  nameOf: (id: ID) => string;
  confirming: boolean;
  busy: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const mine = expense.paidBy === ME;
  return (
    <View style={[styles.panel, { backgroundColor: theme.fill, marginBottom: Spacing.md }]}>
      <AppText variant="caption" color={theme.textSecondary}>
        {`${t.expenses.split} · ${t.expenses.categories[expense.category]}`}
      </AppText>
      {expense.split.map((p) => (
        <View key={p.residentId} style={styles.splitRow}>
          <Avatar initials={residentById(p.residentId)?.initials ?? '?'} size={28} />
          <AppText style={{ flex: 1 }}>{nameOf(p.residentId)}</AppText>
          <AppText>{formatMoney(p.amountBrl, lang)}</AppText>
        </View>
      ))}
      {mine ? (
        confirming ? (
          <View style={{ gap: Spacing.sm }}>
            <AppText variant="callout" color={theme.error}>
              {t.expenses.confirmDelete}
            </AppText>
            <Button
              variant="secondary"
              label={t.expenses.deleteYes}
              loading={busy}
              icon={<Icon name="trash" size={17} color={theme.error} />}
              onPress={onDelete}
            />
            <Button variant="plain" label={t.expenses.cancel} onPress={onCancelDelete} />
          </View>
        ) : (
          <Button
            variant="plain"
            label={t.expenses.deleteExpense}
            icon={<Icon name="trash" size={17} color={theme.textSecondary} />}
            onPress={onAskDelete}
          />
        )
      ) : (
        <AppText variant="caption" color={theme.textSecondary}>
          {t.expenses.onlyPayer(nameOf(expense.paidBy))}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  debtBlock: { paddingVertical: Spacing.md, gap: Spacing.sm },
  debtRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    minHeight: TapTarget,
  },
  panel: { borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm },
  pixRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
