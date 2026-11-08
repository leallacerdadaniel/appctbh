import * as Clipboard from 'expo-clipboard';
import { router, type Href } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, PressableScale } from '@/components/ui';
import { Fonts, Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatBrl, formatDate } from '@/lib/format';
import { useStore } from '@/store';
import { accumulating, currentInvoice, invoices, monthLabel } from '@/store/selectors';
import { paymentInfo, teamWhatsapp } from '@/store/seed';
import type { Charge, InvoiceStatus } from '@/store/types';

/**
 * Monthly bill: rent + last month's extras, paid to Chez Toi by Pix or transfer outside the
 * app. Shows how to pay, what is accumulating for next month, and the paid history.
 */
export default function BillScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();

  const invoice = useStore((s) => currentInvoice(s));
  const pending = useStore((s) => accumulating(s));
  const history = useStore((s) =>
    invoices(s)
      .filter((i) => i.status === 'paid')
      .reverse(),
  );

  async function copy(value: string, what: string) {
    await Clipboard.setStringAsync(value);
    toast(t.bill.copied(what));
  }

  const openRequest = (c: Charge) => c.requestId && router.push(`/requests/${c.requestId}` as Href);
  const month = invoice ? monthLabel(invoice.month, lang) : '';
  const waUrl = `https://wa.me/${teamWhatsapp}${
    invoice ? `?text=${encodeURIComponent(t.bill.proofMessage(month))}` : ''
  }`;

  const payRows: { title: string; value: string }[] = [
    { title: t.bill.beneficiary, value: paymentInfo.beneficiary },
    { title: t.bill.cnpj, value: paymentInfo.cnpj },
    { title: t.bill.bank, value: paymentInfo.bank },
    { title: t.bill.agency, value: paymentInfo.agency },
    { title: t.bill.account, value: paymentInfo.account },
  ];

  return (
    <Screen back title={t.bill.title} subtitle={t.bill.subtitle}>
      {invoice ? (
        <Card style={{ gap: Spacing.sm }}>
          <View style={styles.headRow}>
            <AppText variant="callout" color={theme.textSecondary} style={{ flex: 1 }}>
              {capitalize(t.bill.billOf(month))}
            </AppText>
            <StatusPill status={invoice.status} label={t.bill.status[invoice.status]} />
          </View>
          <AppText variant="display">{formatBrl(invoice.totalBrl, lang)}</AppText>
          <AppText variant="callout">{t.bill.due(formatDate(invoice.dueDate, lang))}</AppText>
        </Card>
      ) : (
        <Card>
          <AppText>{t.bill.nothingDue}</AppText>
        </Card>
      )}

      {invoice && (
        <Section title={t.bill.lines} subtitle={t.bill.linesHint}>
          <Card style={styles.listCard}>
            <ListGroup>
              {invoice.charges.map((c) => (
                <ListRow
                  key={c.id}
                  title={c.label[lang]}
                  value={formatBrl(c.amountBrl, lang)}
                  onPress={c.requestId ? () => openRequest(c) : undefined}
                />
              ))}
              <View style={styles.totalRow}>
                <AppText style={{ flex: 1, fontFamily: Fonts.bodyMedium }}>{t.bill.total}</AppText>
                <AppText style={{ fontFamily: Fonts.bodyMedium }}>{formatBrl(invoice.totalBrl, lang)}</AppText>
              </View>
            </ListGroup>
          </Card>
        </Section>
      )}

      <Section title={t.bill.payTitle} subtitle={t.bill.payHint}>
        <Card style={styles.listCard}>
          <ListGroup>
            <ListRow
              title={t.bill.pixKey}
              subtitle={`${paymentInfo.pixKey} · ${t.bill.pixKeyType[paymentInfo.pixKeyType]}`}
              accessory={
                <CopyButton
                  label={t.bill.copy(t.bill.pixKey)}
                  onPress={() => copy(paymentInfo.pixKey, t.bill.pixKey)}
                />
              }
            />
            {payRows.map((row) => (
              <ListRow
                key={row.title}
                title={row.title}
                subtitle={row.value}
                accessory={
                  <CopyButton label={t.bill.copy(row.title)} onPress={() => copy(row.value, row.title)} />
                }
              />
            ))}
          </ListGroup>
          <View style={styles.proof}>
            <View style={styles.note}>
              <Icon name="info" size={17} color={theme.textSecondary} />
              <AppText variant="callout" color={theme.textSecondary} style={{ flex: 1 }}>
                {t.bill.proof}
              </AppText>
            </View>
            <Button
              variant="secondary"
              label={t.bill.sendProof}
              icon={<Icon name="whatsapp" size={17} color={theme.text} />}
              onPress={() => Linking.openURL(waUrl)}
            />
          </View>
        </Card>
      </Section>

      <Section title={t.bill.accumulating} subtitle={t.bill.accumulatingHint}>
        <Card style={styles.listCard}>
          <ListGroup>
            {pending.length === 0 ? (
              <View style={styles.empty}>
                <AppText color={theme.textSecondary}>{t.bill.accumulatingEmpty}</AppText>
              </View>
            ) : (
              pending.map((c) => (
                <ListRow
                  key={c.id}
                  title={c.label[lang]}
                  value={formatBrl(c.amountBrl, lang)}
                  onPress={c.requestId ? () => openRequest(c) : undefined}
                />
              ))
            )}
            <ListRow
              icon="plus"
              title={t.bill.requestExtra}
              onPress={() => router.push('/requests/new' as Href)}
            />
          </ListGroup>
        </Card>
      </Section>

      <Section title={t.bill.history} subtitle={t.bill.historyHint}>
        <Card style={styles.listCard}>
          {history.length === 0 ? (
            <View style={styles.empty}>
              <AppText color={theme.textSecondary}>{t.bill.historyEmpty}</AppText>
            </View>
          ) : (
            <ListGroup>
              {history.map((i) => (
                <ListRow
                  key={i.month}
                  title={capitalize(monthLabel(i.month, lang))}
                  subtitle={i.paidAt ? t.bill.paidOn(formatDate(i.paidAt, lang)) : undefined}
                  value={formatBrl(i.totalBrl, lang)}
                />
              ))}
            </ListGroup>
          )}
        </Card>
      </Section>
    </Screen>
  );
}

function CopyButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.iconButton}>
      <Icon name="copy" size={18} color={theme.textSecondary} />
    </PressableScale>
  );
}

/** Invoice status: neutral pill, green when paid, error color (never brand red) when overdue. */
function StatusPill({ status, label }: { status: InvoiceStatus; label: string }) {
  const theme = useTheme();
  const fg = status === 'paid' ? theme.success : status === 'overdue' ? theme.error : theme.text;
  const bg = status === 'paid' ? theme.successSoft : status === 'overdue' ? theme.errorSoft : theme.fill;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {status === 'overdue' && <Icon name="warning" size={13} color={fg} />}
      <AppText variant="caption" color={fg} style={{ fontFamily: Fonts.bodyMedium }}>
        {label}
      </AppText>
    </View>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  totalRow: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: 14 },
  proof: { gap: Spacing.md, paddingBottom: Spacing.md },
  note: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  empty: { paddingVertical: Spacing.md },
  iconButton: {
    width: TapTarget,
    height: TapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
});
