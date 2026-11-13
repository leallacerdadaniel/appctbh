import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { TintCard } from '@/components/home-v3';
import { DangerCard, ModeCard, NoteCard, PrepRow, ProgressBar } from '@/components/phone-stolen-ui';
import { Screen, Section } from '@/components/screen';
import { AppText } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { PREP_CONTENT, PREP_STEPS, usePhonePrep } from '@/lib/phone-stolen';

/**
 * "On m'a volé mon téléphone" (2026-11-08). The victim has no phone: the main way in is "J'aide un
 * colocataire" (the roommate goes through the steps on their own phone). Under it, what to set up before it
 * happens, ticked and kept on this phone. Opened from the SOS page (`PhoneStolenEntry`).
 */
export default function PhoneStolenScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const p = t.phoneStolen;
  const prep = usePhonePrep();
  const count = PREP_STEPS.filter((s) => prep.done.includes(s)).length;
  const total = PREP_STEPS.length;

  return (
    <Screen back title={p.title} subtitle={p.subtitle}>
      <DangerCard />

      <Section title={p.now} subtitle={p.nowSubtitle}>
        <ModeCard
          icon="people"
          title={p.helpMode}
          hint={p.helpModeHint}
          onPress={() => router.push('/phone-stolen/help' as Href)}
        />
        <NoteCard icon="laptop" text={p.computer} />
      </Section>

      <Section title={p.before} subtitle={p.beforeSubtitle(total)}>
        {prep.loaded && (
          <>
            <ProgressBar count={count} total={total} label={p.beforeProgress(count, total)} />
            <TintCard>
              {PREP_STEPS.map((id, i) => (
                <PrepRow
                  key={id}
                  first={i === 0}
                  step={PREP_CONTENT[id]}
                  done={prep.done.includes(id)}
                  onToggle={() => prep.toggle(id)}
                />
              ))}
            </TintCard>
            <AppText variant="caption" color={count === total ? theme.success : theme.textSecondary}>
              {count === total ? p.allReady : p.savedHere}
            </AppText>
          </>
        )}
      </Section>

      <View style={{ marginTop: -Spacing.md }}>
        <AppText variant="caption" color={theme.textSecondary}>
          {p.sources}
        </AppText>
      </View>
    </Screen>
  );
}
