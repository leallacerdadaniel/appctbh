import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CharlotteFace } from '@/components/charlotte';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { AppText, Card, PressableScale } from '@/components/ui';
import { Fonts, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, type Lang } from '@/i18n';
import { strings } from '@/i18n/strings';
import { useFinishLanguage } from '@/lib/language-intro';

const CHOICES: Lang[] = ['fr', 'en'];

/**
 * "Quelle langue préférez-vous ?" (owner, 2026-11-27): first of the first-run screens, before the house rules and
 * Charlotte's tour. The question is written in both languages (the student hasn't chosen yet); one tap picks the
 * language and goes on.
 */
export default function LanguageIntroScreen() {
  const theme = useTheme();
  const { lang, setLang } = useI18n();
  const finish = useFinishLanguage();

  async function pick(next: Lang) {
    setLang(next);
    await finish();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <Screen bar="none">
      <View style={styles.head}>
        <CharlotteFace size={72} sparkle />
        {CHOICES.map((l) => (
          <View key={l} style={styles.question}>
            <AppText variant="display" style={styles.center}>
              {strings[l].languageIntro.title}
            </AppText>
            <AppText color={theme.textSecondary} style={styles.center}>
              {strings[l].languageIntro.subtitle}
            </AppText>
          </View>
        ))}
      </View>

      <View style={{ gap: Spacing.md }}>
        {CHOICES.map((l) => {
          const current = l === lang;
          return (
            <PressableScale
              key={l}
              accessibilityRole="button"
              accessibilityState={{ selected: current }}
              accessibilityLabel={strings[l].languageIntro[l]}
              onPress={() => pick(l)}>
              <Card style={[styles.choice, current && { borderColor: theme.brand }]}>
                <AppText variant="title" style={{ flex: 1, fontFamily: Fonts.bodySemi }}>
                  {strings[l].languageIntro[l]}
                </AppText>
                <Icon name={current ? 'checkCircleFill' : 'chevronRight'} size={22} color={current ? theme.brand : theme.textTertiary} />
              </Card>
            </PressableScale>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: Spacing.lg, paddingTop: Spacing.lg },
  question: { gap: Spacing.xs, alignItems: 'center' },
  center: { textAlign: 'center' },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: TapTarget + 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
});
