import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RowPill, TintCard, TintRow } from '@/components/home-v3';
import { Icon } from '@/components/icon';
import { ListRow } from '@/components/list';
import { AppText, PressableScale, tapFeedback } from '@/components/ui';
import { Fonts, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { unreadReplies, useFeedback, useSurveyStatus, type SurveyKind } from '@/lib/feedback';

export const surveyHref = (kind: SurveyKind) => `/survey?kind=${kind}` as Href;

/* ---------- Entry rows (Séjour › Aide) ---------- */

/** "Donner mon avis", with the number of team replies not read yet. */
export function FeedbackHubRow() {
  const theme = useTheme();
  const { t } = useI18n();
  const { state, ensure } = useFeedback();
  // The tab stays mounted: a reply from the team shows when the student comes back to it.
  useFocusEffect(useCallback(() => ensure(), [ensure]));
  const unread = state.status === 'ready' ? unreadReplies(state.data).length : 0;
  return (
    <ListRow
      icon="feedback"
      title={t.feedback.rowTitle}
      subtitle={unread > 0 ? t.feedback.rowUnread(unread) : t.feedback.rowHint}
      subtitleColor={unread > 0 ? theme.info : undefined}
      onPress={() => router.push('/feedback' as Href)}
    />
  );
}

/** "Parrainer un ami". Static line: the code is created the first time the page opens, not from the tab. */
export function ReferralHubRow() {
  const { t } = useI18n();
  return (
    <ListRow
      icon="gift"
      title={t.referral.rowTitle}
      subtitle={t.referral.rowHint}
      onPress={() => router.push('/referral' as Href)}
    />
  );
}

/* ---------- Accueil: the survey when it is due ---------- */

/** One action row on Accueil while a survey is due (middle or end of the stay); nothing otherwise. */
export function SurveyInvite() {
  const theme = useTheme();
  const { t } = useI18n();
  const { state, ensure } = useSurveyStatus();
  // Accueil stays mounted: check again when the tab comes back (at most every 30 s).
  useFocusEffect(useCallback(() => ensure(), [ensure]));
  const due = state.status === 'ready' ? state.data.due : null;
  if (!due) return null;
  const open = () => router.push(surveyHref(due));
  return (
    <TintCard>
      <TintRow
        first
        icon="star"
        tint={theme.warningSoft}
        ink={theme.star}
        title={due === 'end' ? t.survey.titleEnd : t.survey.titleMid}
        subtitle={t.survey.homeHint}
        // Secondary pill: on Accueil only the rent "Payer" is brand red (UX review 2026-11-09).
        accessory={<RowPill label={t.survey.answer} onPress={open} />}
      />
    </TintCard>
  );
}

/* ---------- Survey pieces ---------- */

/** Two fixed rows of six slots, so the scale reads the same on every width. */
const SCALE_ROWS = [
  [0, 1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
];
const SLOTS = 6;

/** 0 to 10 as 44 pt squares on two rows (0–5, 6–10); the chosen one red. */
export function ScoreScale({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <View style={{ gap: Spacing.sm }}>
      <View style={{ gap: Spacing.sm }} accessibilityRole="radiogroup" accessibilityLabel={t.survey.npsQuestion}>
        {SCALE_ROWS.map((row) => (
          <View key={row[0]} style={styles.scale}>
            {row.map((n) => {
              const selected = n === value;
              return (
                <PressableScale
                  key={n}
                  accessibilityRole="radio"
                  accessibilityLabel={t.survey.npsValue(n)}
                  accessibilityState={{ checked: selected }}
                  onPress={() => onChange(n)}
                  style={[styles.score, { backgroundColor: selected ? theme.brand : theme.fill }]}>
                  <AppText color={selected ? theme.onBrand : theme.text} style={{ fontFamily: Fonts.bodySemi }}>
                    {String(n)}
                  </AppText>
                </PressableScale>
              );
            })}
            {/* Same six slots on both rows, so 6–10 sit right under 0–4. */}
            {row.length < SLOTS && <View style={styles.slot} />}
          </View>
        ))}
      </View>
      <View style={styles.scaleLegend}>
        <AppText variant="caption" color={theme.textSecondary} style={{ flex: 1 }}>
          {t.survey.npsLow}
        </AppText>
        <AppText variant="caption" color={theme.textSecondary} style={{ flex: 1, textAlign: 'right' }}>
          {t.survey.npsHigh}
        </AppText>
      </View>
    </View>
  );
}

/** Checkbox + sentence, the whole row tappable (44 pt at least). */
export function CheckRow({ checked, label, onChange }: { checked: boolean; label: string; onChange: (v: boolean) => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => {
        tapFeedback();
        onChange(!checked);
      }}
      style={({ pressed }) => [styles.check, pressed && { opacity: 0.6 }]}>
      <Icon name={checked ? 'checkCircleFill' : 'circle'} size={26} color={checked ? theme.success : theme.textTertiary} />
      <AppText variant="callout" style={{ flex: 1 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Small dark dot + "Nouveau", for a reply the student hasn't seen (same dot as the notices page). */
export function NewBadge({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.newBadge}>
      <View style={[styles.dot, { backgroundColor: theme.text }]} />
      <AppText variant="caption" style={{ fontFamily: Fonts.bodySemi }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  scale: { flexDirection: 'row', gap: Spacing.sm },
  // 44 pt tall; as wide as the card allows (about 44 pt on a 375 pt phone), never wider than 56.
  slot: { flex: 1, maxWidth: 56 },
  score: {
    flex: 1,
    maxWidth: 56,
    height: TapTarget,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleLegend: { flexDirection: 'row', gap: Spacing.md },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: TapTarget },
  newBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
