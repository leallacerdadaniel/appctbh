import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HowToPay } from '@/components/how-to-pay';
import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { rentMonthLabel, requestHref, requestIcon, requestTitle, requestWhen } from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { AppText, Card, PressableScale, StepNumber } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, type Lang } from '@/i18n';
import { formatCents, formatDate, formatMoney, isFutureMonth } from '@/lib/format';
import { useHome, useHomeState } from '@/lib/home';
import { usePaymentInfo } from '@/lib/payment-info';
import { billedCents, upcomingCharges, useRequests } from '@/lib/requests';

/**
 * Rent month by month (paid / due / still to come, never the amount), how to pay (Pix, bank, Wise),
 * the extras that go on the next rents (wave 6) and the student's security deposit.
 */
export default function PaymentsScreen() {
  const { t, lang } = useI18n();
  const p = t.apartment.payments;
  const theme = useTheme();
  const { payments, deposit } = useHome();
  const { refresh } = useHomeState();
  const [stepsOpen, setStepsOpen] = useState(false);
  const paidCount = payments.filter((m) => m.paid).length;
  const { state: requestsState, reload: reloadRequests } = useRequests();
  const requestsData = requestsState.status === 'ready' ? requestsState.data : null;
  const charges = requestsData ? upcomingCharges(requestsData.requests) : [];
  const payInfo = usePaymentInfo();

  const depositColor =
    deposit?.status === 'returned'
      ? theme.success
      : deposit?.status === 'pending'
        ? theme.warning
        : theme.textSecondary;

  return (
    <Screen
      back
      title={p.title}
      subtitle={p.subtitle}
      onRefresh={() => Promise.all([refresh(), reloadRequests(), payInfo.reload()])}>
      <Section title={p.rent}>
        <Card style={payments.length ? { paddingVertical: 0 } : undefined}>
          {payments.length ? (
            <>
              <View style={styles.summary}>
                <AppText variant="callout">{p.paidOf(paidCount, payments.length)}</AppText>
                <View style={[styles.track, { backgroundColor: theme.fill }]}>
                  <View
                    style={[
                      styles.progress,
                      { backgroundColor: theme.success, width: `${(paidCount / payments.length) * 100}%` },
                    ]}
                  />
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.line }]} />
              <ListGroup inset>
                {payments.map((m) => {
                  const future = !m.paid && isFutureMonth(m.month);
                  return (
                    <ListRow
                      key={m.month}
                      icon={m.paid ? 'checkCircle' : 'clock'}
                      title={monthLabel(m.month, lang)}
                      muted={future}
                      accessory={
                        future ? undefined : (
                          <AppText
                            variant="caption"
                            color={m.paid ? theme.success : theme.warning}
                            style={{ fontFamily: Fonts.bodyMedium }}>
                            {m.paid ? p.paid : p.waiting}
                          </AppText>
                        )
                      }
                    />
                  );
                })}
              </ListGroup>
            </>
          ) : (
            <AppText variant="callout" color={theme.textSecondary}>
              {p.noRent}
            </AppText>
          )}
        </Card>
      </Section>

      <HowToPay {...payInfo} />

      {charges.length > 0 && (
        <Section title={t.requests.nextRent} subtitle={t.requests.nextRentHint}>
          {charges.map((c) => (
            <Card key={`${c.month}-${c.currency}`} style={{ paddingVertical: 0 }}>
              <View style={[styles.summary, styles.chargeHead]}>
                <AppText style={{ flex: 1 }}>{capitalize(t.requests.rentOf(rentMonthLabel(c.month, lang)))}</AppText>
                <AppText variant="title">{formatCents(c.cents, lang, c.currency)}</AppText>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.line }]} />
              <ListGroup inset>
                {c.requests.map((req) => (
                  <ListRow
                    key={req.id}
                    icon={requestIcon(req, requestsData?.catalog)}
                    title={requestTitle(req, t, lang)}
                    subtitle={requestWhen(req, t, lang)}
                    value={formatCents(billedCents(req), lang, req.currency)}
                    onPress={() => router.push(requestHref(`/requests/${req.id}`))}
                  />
                ))}
              </ListGroup>
            </Card>
          ))}
        </Section>
      )}

      <Section title={p.deposit}>
        <Card style={{ gap: Spacing.md }}>
          {deposit ? (
            <>
              <View style={styles.depositHead}>
                <AppText variant="display">{formatMoney(deposit.amount, deposit.currency, lang)}</AppText>
                <View style={[styles.pill, { backgroundColor: theme.fill }]}>
                  <AppText variant="caption" color={depositColor} style={{ fontFamily: Fonts.bodyMedium }}>
                    {deposit.status === 'returned'
                      ? deposit.returnedDate
                        ? p.returnedOn(formatDate(deposit.returnedDate, lang))
                        : p.returnedShort
                      : deposit.status === 'pending'
                        ? p.depositPending
                        : p.withUs}
                  </AppText>
                </View>
              </View>

              {deposit.status !== 'returned' && (
                <>
                  {/* Short line always visible; the full rule only for whoever wants it. */}
                  <AppText variant="callout" color={theme.textSecondary}>
                    {p.depositNote}
                  </AppText>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityState={{ expanded: stepsOpen }}
                    onPress={() => setStepsOpen((o) => !o)}
                    style={styles.toggle}>
                    <AppText variant="callout" color={theme.brand}>
                      {p.howItWorks}
                    </AppText>
                    <Icon name={stepsOpen ? 'chevronUp' : 'chevronDown'} size={13} color={theme.brand} />
                  </PressableScale>
                  {stepsOpen && (
                    <View style={{ gap: Spacing.md }}>
                      {p.steps.map((step, i) => (
                        <View key={i} style={styles.step}>
                          <StepNumber n={i + 1} />
                          <AppText variant="callout" style={{ flex: 1 }}>
                            {step}
                          </AppText>
                        </View>
                      ))}
                      <AppText variant="callout" color={theme.textSecondary}>
                        {p.depositCare}
                      </AppText>
                    </View>
                  )}
                </>
              )}
            </>
          ) : (
            <AppText variant="callout" color={theme.textSecondary}>
              {p.noDeposit}
            </AppText>
          )}
        </Card>
      </Section>
    </Screen>
  );
}

/** "2027-01-01" → "Janvier 2027" (fr) · "January 2027" (en) */
function monthLabel(iso: string, lang: Lang) {
  const [y, m] = iso.split('-').map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  summary: { gap: Spacing.sm, paddingVertical: Spacing.md },
  chargeHead: { flexDirection: 'row', alignItems: 'baseline' },
  track: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  progress: { height: '100%', borderRadius: Radius.pill },
  divider: { height: StyleSheet.hairlineWidth },
  depositHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
});
