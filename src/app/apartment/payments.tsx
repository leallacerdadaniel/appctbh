import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { AppText, Card, PressableScale } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, type Lang } from '@/i18n';
import { formatDate, formatMoney } from '@/lib/format';
import { useHome } from '@/lib/home';

/** Rent month by month (paid / pending, never the amount) + the student's security deposit. */
export default function PaymentsScreen() {
  const { t, lang } = useI18n();
  const p = t.apartment.payments;
  const theme = useTheme();
  const { payments, deposit } = useHome();
  const [stepsOpen, setStepsOpen] = useState(false);

  return (
    <Screen back title={p.title} subtitle={p.subtitle}>
      <Section title={p.rent}>
        <Card style={payments.length ? { paddingVertical: 0 } : undefined}>
          {payments.length ? (
            <ListGroup inset>
              {payments.map((m) => (
                <ListRow
                  key={m.month}
                  icon={m.paid ? 'checkCircle' : 'clock'}
                  title={monthLabel(m.month, lang)}
                  accessory={
                    <AppText
                      variant="caption"
                      color={m.paid ? theme.success : theme.warning}
                      style={{ fontFamily: Fonts.bodyMedium }}>
                      {m.paid ? p.paid : p.waiting}
                    </AppText>
                  }
                />
              ))}
            </ListGroup>
          ) : (
            <AppText variant="callout" color={theme.textSecondary}>
              {p.noRent}
            </AppText>
          )}
        </Card>
      </Section>

      <Section title={p.deposit}>
        <Card style={{ gap: Spacing.md }}>
          {deposit ? (
            <>
              <View style={{ gap: 2 }}>
                <AppText variant="display">{formatMoney(deposit.amount, deposit.currency, lang)}</AppText>
                <AppText
                  variant="callout"
                  color={
                    deposit.status === 'returned'
                      ? theme.success
                      : deposit.status === 'pending'
                        ? theme.warning
                        : theme.textSecondary
                  }>
                  {deposit.status === 'returned'
                    ? deposit.returnedDate
                      ? p.returnedOn(formatDate(deposit.returnedDate, lang))
                      : p.returnedShort
                    : deposit.status === 'pending'
                      ? p.depositPending
                      : p.withUs}
                </AppText>
              </View>

              {deposit.status !== 'returned' && (
                <>
                  <View style={[styles.divider, { backgroundColor: theme.line }]} />
                  {/* Short line always visible; the full rule only for whoever wants it. */}
                  <AppText variant="callout">{p.depositNote}</AppText>
                  <AppText variant="callout" color={theme.textSecondary}>
                    {p.depositCare}
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
                          <View style={[styles.stepNumber, { backgroundColor: theme.fill }]}>
                            <AppText variant="caption" style={{ fontFamily: Fonts.bodyMedium }}>
                              {i + 1}
                            </AppText>
                          </View>
                          <AppText variant="callout" style={{ flex: 1 }}>
                            {step}
                          </AppText>
                        </View>
                      ))}
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

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  stepNumber: { width: 24, height: 24, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
});
