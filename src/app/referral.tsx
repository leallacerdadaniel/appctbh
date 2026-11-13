import * as Clipboard from 'expo-clipboard';
import { Share, StyleSheet, View } from 'react-native';

import { RowPill, TintCard, TintRow } from '@/components/home-v3';
import { Icon } from '@/components/icon';
import { Notice } from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, LoadingState, RetryCard, StepNumber } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { bhDay, SITE_URL, useReferral, type ReferralData, type ReferralStatus } from '@/lib/feedback';
import { trackAction } from '@/lib/usage';

/**
 * Parrainer un ami (Séjour › Aide): the student's personal code (created the first time this page opens),
 * shared with the phone's share sheet in the app's language with the site link; the reward and terms
 * written by the team in the panel (hidden while empty); and the friends the team recorded with the code
 * (first name and status only).
 */
export default function ReferralScreen() {
  const { t } = useI18n();
  const r = t.referral;
  const { state, reload } = useReferral();
  return (
    <Screen back title={r.title} subtitle={r.subtitle} onRefresh={reload}>
      {state.status === 'loading' && <LoadingState label={t.common.loading} />}
      {state.status === 'error' && <RetryCard message={r.unavailable} retryLabel={t.common.retry} onRetry={reload} />}
      {state.status === 'ready' && <Content data={state.data} />}
    </Screen>
  );
}

function Content({ data }: { data: ReferralData }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const r = t.referral;
  const { program } = data;

  return (
    <>
      {program.active ? (
        <>
          <CodeCard code={data.code} />
          {program.reward && (
            <Card style={{ gap: Spacing.sm }}>
              <View style={styles.rewardTop}>
                <View style={[styles.rewardIcon, { backgroundColor: theme.successSoft }]}>
                  <Icon name="gift" size={19} color={theme.success} />
                </View>
                <AppText style={{ flex: 1, fontFamily: Fonts.bodySemi }}>{r.reward}</AppText>
              </View>
              <AppText>{program.reward[lang]}</AppText>
              {program.terms && (
                <View style={{ gap: 2, marginTop: Spacing.xs }}>
                  <AppText variant="caption" color={theme.textSecondary} style={{ fontFamily: Fonts.bodySemi }}>
                    {r.terms}
                  </AppText>
                  <AppText variant="caption" color={theme.textSecondary}>
                    {program.terms[lang]}
                  </AppText>
                </View>
              )}
            </Card>
          )}
          {!program.reward && program.terms && (
            <Card style={{ gap: 2 }}>
              <AppText variant="caption" color={theme.textSecondary} style={{ fontFamily: Fonts.bodySemi }}>
                {r.terms}
              </AppText>
              <AppText variant="caption" color={theme.textSecondary}>
                {program.terms[lang]}
              </AppText>
            </Card>
          )}
          <Section title={r.how}>
            <Card style={{ gap: Spacing.md }}>
              {r.steps.map((step, i) => (
                <View key={step} style={styles.step}>
                  <StepNumber n={i + 1} />
                  <AppText style={{ flex: 1 }}>{step}</AppText>
                </View>
              ))}
            </Card>
          </Section>
        </>
      ) : (
        <Card>
          <Notice icon="info" text={r.paused} />
        </Card>
      )}

      <Section title={r.mine} subtitle={data.referrals.length > 0 ? r.mineHint : undefined}>
        {data.referrals.length === 0 ? (
          <Card>
            <AppText color={theme.textSecondary}>{r.empty}</AppText>
          </Card>
        ) : (
          <TintCard>
            {data.referrals.map((friend, i) => (
              <TintRow
                key={`${friend.createdAt}-${i}`}
                first={i === 0}
                icon="profile"
                tint={STATUS_TINT(theme)[friend.status].tint}
                ink={STATUS_TINT(theme)[friend.status].ink}
                title={friend.friendFirstName}
                subtitle={r.since(bhDay(friend.createdAt, lang))}
                accessory={<StatusLabel status={friend.status} />}
              />
            ))}
          </TintCard>
        )}
      </Section>
    </>
  );
}

/** The code large, "Copier", and the share sheet with a short message in the app's language. */
function CodeCard({ code }: { code: string }) {
  const theme = useTheme();
  const toast = useToast();
  const { t } = useI18n();
  const r = t.referral;

  async function copy() {
    await Clipboard.setStringAsync(code);
    toast(r.copied);
  }

  function share() {
    trackAction('referral_shared');
    Share.share({ title: r.shareTitle, message: r.shareMessage(code, SITE_URL) }).catch(() => {});
  }

  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={styles.codeRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" color={theme.textSecondary}>
            {r.yourCode}
          </AppText>
          <AppText
            variant="display"
            selectable
            accessibilityLabel={`${r.yourCode} ${code.split('').join(' ')}`}
            style={styles.code}>
            {code}
          </AppText>
        </View>
        <RowPill label={r.copy} onPress={copy} />
      </View>
      <Button label={r.share} icon={<Icon name="share" size={17} color={theme.onBrand} />} onPress={share} />
    </Card>
  );
}

function StatusLabel({ status }: { status: ReferralStatus }) {
  const theme = useTheme();
  const { t } = useI18n();
  const { ink, tint } = STATUS_TINT(theme)[status];
  return (
    <View style={[styles.pill, { backgroundColor: tint }]}>
      <AppText variant="caption" color={ink} style={{ fontFamily: Fonts.bodyMedium }}>
        {t.referral.status[status]}
      </AppText>
    </View>
  );
}

/** Never brand red: green once the friend signed, amber while it moves, gray otherwise. */
const STATUS_TINT = (theme: ReturnType<typeof useTheme>): Record<ReferralStatus, { tint: string; ink: string }> => ({
  lead: { tint: theme.fill, ink: theme.textSecondary },
  visit: { tint: theme.warningSoft, ink: theme.warning },
  signed: { tint: theme.successSoft, ink: theme.success },
  rewarded: { tint: theme.successSoft, ink: theme.success },
  lost: { tint: theme.fill, ink: theme.textTertiary },
});

const styles = StyleSheet.create({
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  code: { letterSpacing: 4 },
  rewardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rewardIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
});
