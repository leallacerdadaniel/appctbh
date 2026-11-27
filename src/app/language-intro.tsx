import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CharlotteFace } from '@/components/charlotte';
import { Icon } from '@/components/icon';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, type Lang } from '@/i18n';
import { strings } from '@/i18n/strings';
import { useFinishLanguage } from '@/lib/language-intro';

const CHOICES: Lang[] = ['fr', 'en'];

/**
 * The language question at first launch, before the house rules and Charlotte's tour. A small sheet over Accueil, not
 * a full screen (owner, 2026-11-27: "tinha que ser mais discreto"): the question in both languages, two pills, the
 * current one marked; a tap on the dimmed app keeps the current language.
 */
export default function LanguageIntroScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { lang, setLang } = useI18n();
  const finish = useFinishLanguage();

  async function pick(next: Lang) {
    setLang(next);
    await finish();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings[lang].languageIntro[lang]}
        onPress={() => pick(lang)}
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]}
      />
      <View style={[styles.sheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.head}>
          <CharlotteFace size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            {CHOICES.map((l) => (
              <AppText key={l} style={{ fontFamily: l === lang ? Fonts.bodySemi : Fonts.body }} color={l === lang ? theme.text : theme.textSecondary}>
                {strings[l].languageIntro.title}
              </AppText>
            ))}
          </View>
        </View>
        <View style={styles.choices}>
          {CHOICES.map((l) => {
            const current = l === lang;
            return (
              <PressableScale
                key={l}
                accessibilityRole="button"
                accessibilityState={{ selected: current }}
                accessibilityLabel={strings[l].languageIntro[l]}
                onPress={() => pick(l)}
                style={[
                  styles.choice,
                  { backgroundColor: current ? theme.brandSoft : theme.background, borderColor: current ? theme.brand : 'transparent' },
                ]}>
                {current && <Icon name="check" size={16} color={theme.brand} />}
                <AppText style={{ fontFamily: Fonts.bodySemi }} color={current ? theme.brandText : theme.text}>
                  {strings[l].languageIntro[l]}
                </AppText>
              </PressableScale>
            );
          })}
        </View>
        <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
          {strings[lang].languageIntro.subtitle}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.gutter,
    gap: Spacing.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  choices: { flexDirection: 'row', gap: Spacing.sm },
  choice: {
    flex: 1,
    minHeight: TapTarget + 4,
    borderRadius: Radius.pill,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
