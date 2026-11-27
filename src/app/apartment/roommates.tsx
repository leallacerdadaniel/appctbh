import { router, type Href } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { RowPill, TintCard, TintRow } from '@/components/home-v3';
import { Icon, type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { AppText, Avatar, Card, LoadingState, RetryCard } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { person, useHome } from '@/lib/home';
import { useChoreStatus } from '@/lib/chores';
import { useBalanceLabel } from '@/lib/expenses';
import { hasContent, languageName, useRoommateProfiles, type SocialProfile } from '@/lib/house-social';

/**
 * Who lives in the apartment with the student (Maison › Entre colocataires), with the short profile each
 * roommate chose to share (school, city, languages, Instagram, one line), then the shared expenses and the chores.
 * The student's own profile is edited from Profil (2026-11-27).
 */
export default function RoommatesScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const s = t.houseSocial.profile;
  const { roommates } = useHome();
  const { state, reload } = useRoommateProfiles();
  const balance = useBalanceLabel();
  const choreStatus = useChoreStatus();

  return (
    <Screen
      back
      title={t.roommates.title}
      subtitle={t.roommates.subtitle}
      onRefresh={reload}>
      {roommates.length === 0 ? (
        <Card>
          <AppText color={theme.textSecondary}>{t.roommates.empty}</AppText>
        </Card>
      ) : (
        <>
          {/* Names come with the home data at once; the profiles follow from app-house. */}
          {state.status === 'ready'
            ? state.data.roommates.map((r) => <RoommateCard key={r.id} name={r.name} profile={r.profile} />)
            : roommates.map((r, i) => <RoommateCard key={`${r.fullName}-${i}`} name={r.fullName} />)}
          {state.status === 'loading' && <LoadingState label={t.common.loading} />}
          {state.status === 'error' && (
            <RetryCard message={s.roommatesUnavailable} retryLabel={t.common.retry} onRetry={reload} />
          )}

          {/* The house tools here, not the student's own profile (owner, 2026-11-27); the profile stays in Profil. */}
          <TintCard>
            <TintRow
              first
              icon="wallet"
              tint={theme.successSoft}
              ink={theme.success}
              title={t.expenses.homeRow}
              subtitle={balance || t.expenses.subtitle}
              onPress={() => router.push('/expenses')}
            />
            <TintRow
              icon="plus"
              tint={theme.fill}
              ink={theme.text}
              title={t.expenses.add}
              onPress={() => router.push('/expenses/edit')}
            />
            <TintRow
              icon="chores"
              tint={theme.warningSoft}
              ink={theme.warning}
              title={t.chores.tile}
              subtitle={choreStatus || t.chores.subtitle}
              onPress={() => router.push('/house/chores' as Href)}
            />
          </TintCard>
        </>
      )}
    </Screen>
  );
}

/** `profile` undefined = profiles still loading (or failed): only the name. null = not shared. */
function RoommateCard({ name, profile }: { name: string; profile?: SocialProfile | null }) {
  const theme = useTheme();
  const { t } = useI18n();
  const s = t.houseSocial.profile;
  const who = person(name);
  const shown = hasContent(profile) ? profile : null;

  return (
    <Card style={{ gap: 12 }}>
      <View style={styles.top}>
        <Avatar initials={who.initials} size={48} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText style={{ fontFamily: Fonts.bodySemi }}>{who.fullName}</AppText>
          {shown?.hometown ? (
            <AppText variant="caption" color={theme.textSecondary}>
              {shown.hometown}
            </AppText>
          ) : profile !== undefined && !shown ? (
            <AppText variant="caption" color={theme.textSecondary}>
              {s.notShared}
            </AppText>
          ) : null}
        </View>
      </View>
      {shown && (
        <>
          {shown.about && <AppText variant="callout">{shown.about}</AppText>}
          {shown.school && <Fact icon="school" text={shown.school} />}
          {shown.languages.length > 0 && (
            <Fact icon="translate" text={shown.languages.map((l) => languageName(l, t)).join(' · ')} />
          )}
          {shown.instagram && (
            <View style={styles.pillRow}>
              <RowPill
                label={`@${shown.instagram}`}
                onPress={() => Linking.openURL(`https://instagram.com/${shown.instagram}`)}
              />
            </View>
          )}
        </>
      )}
    </Card>
  );
}

function Fact({ icon, text }: { icon: IconName; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.fact}>
      <Icon name={icon} size={16} color={theme.textSecondary} />
      <AppText variant="callout" style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  fact: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pillRow: { flexDirection: 'row' },
});
