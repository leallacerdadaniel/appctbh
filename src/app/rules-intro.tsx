import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { FocusStatusBar } from '@/components/focus-status-bar';
import { Icon, type IconName } from '@/components/icon';
import { AppText, PressableScale, tapFeedback } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useHome } from '@/lib/home';
import { useAcceptRules } from '@/lib/rules-intro';

/** One icon per slide of `t.rulesIntro.slides`, same order. */
const SLIDE_ICONS: IconName[] = ['moon', 'warning', 'party', 'trash', 'noSmoking', 'hanger', 'lock'];
const HOLD_MS = 1400;

/**
 * Mandatory house rules intro, Quittr-like (owner, 2026-11-08): one rule per screen on the brand red,
 * progress on top, and a hold-to-sign button at the end. Opened over the tabs until the student signs
 * the current version (see `useRulesIntro`); there is no way to close it before signing.
 */
export default function RulesIntroScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t, lang } = useI18n();
  const r = t.rulesIntro;
  const { student } = useHome();
  const accept = useAcceptRules(student.email);
  // 0 = intro, 1..n = rules, n + 1 = commitment, n + 2 = signed.
  const total = r.slides.length + 2;
  const [step, setStep] = useState(0);
  const signed = step === total;

  // Android: the hardware back button would close the modal without signing (gestureEnabled only covers iOS).
  // Until signed, it goes back one slide instead and never leaves.
  useEffect(() => {
    if (signed) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setStep((s) => Math.max(0, s - 1));
      return true;
    });
    return () => sub.remove();
  }, [signed]);

  const isRule = step >= 1 && step <= r.slides.length;
  const isCommit = step === total - 1;

  async function sign() {
    tapFeedback();
    await accept(lang);
    setStep(total);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.brand }}>
      <FocusStatusBar style="light" />
      <LinearGradient colors={[theme.brand, '#8E0716']} style={StyleSheet.absoluteFill} />
      <View
        style={[
          styles.column,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.lg },
        ]}>
        {!signed && (
          <View style={styles.progress} accessible accessibilityLabel={r.step(step + 1, total)}>
            {Array.from({ length: total }, (_, i) => (
              <View
                key={i}
                style={[styles.segment, { backgroundColor: i <= step ? theme.onBrand : 'rgba(255,255,255,0.28)' }]}
              />
            ))}
          </View>
        )}

        <View style={styles.body}>
          <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
            <Icon
              name={signed ? 'checkCircle' : isCommit ? 'handshake' : isRule ? SLIDE_ICONS[step - 1] : 'home'}
              size={44}
              color={theme.onBrand}
            />
          </View>
          <AppText variant="display" color={theme.onBrand} style={styles.title}>
            {signed ? r.commit.done : isCommit ? r.commit.title : isRule ? r.slides[step - 1].title : r.intro.title}
          </AppText>
          <AppText color="rgba(255,255,255,0.88)" style={styles.text}>
            {signed ? r.commit.doneBody : isCommit ? r.commit.body : isRule ? r.slides[step - 1].body : r.intro.body}
          </AppText>
        </View>

        {signed ? (
          <WhiteButton label={r.commit.enter} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        ) : isCommit ? (
          <HoldToSign label={r.commit.hold} a11y={r.commit.a11y} onDone={sign} />
        ) : (
          <WhiteButton label={step === 0 ? r.start : r.next} onPress={() => setStep(step + 1)} />
        )}
        {!signed && step > 0 && (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={r.back}
            hitSlop={8}
            onPress={() => setStep(step - 1)}
            style={styles.back}>
            <AppText variant="callout" color="rgba(255,255,255,0.8)">
              {r.back}
            </AppText>
          </PressableScale>
        )}
      </View>
    </View>
  );
}

function WhiteButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.button, { backgroundColor: theme.onBrand }]}>
      <AppText style={{ fontFamily: Fonts.bodySemi, fontSize: 17 }} color={theme.brand}>
        {label}
      </AppText>
    </PressableScale>
  );
}

/**
 * Press and hold: the white fill crosses the button in 1.4 s; letting go before the end starts over.
 * The label is drawn twice: white on the red, red inside the white fill (clipped to the fill's width).
 */
function HoldToSign({ label, a11y, onDone }: { label: string; a11y: string; onDone: () => void }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const fill = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint={label}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={() => onDone()}
      onPressIn={() => {
        tapFeedback();
        progress.set(
          withTiming(1, { duration: reduceMotion ? 300 : HOLD_MS, easing: Easing.linear }, (finished) => {
            if (finished) scheduleOnRN(onDone);
          }),
        );
      }}
      onPressOut={() => {
        if (progress.get() < 1) {
          cancelAnimation(progress);
          progress.set(withTiming(0, { duration: 200 }));
        }
      }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.button, styles.hold, { borderColor: theme.onBrand }]}>
      <AppText style={styles.holdLabel} color={theme.onBrand}>
        {label}
      </AppText>
      <Animated.View style={[styles.holdFill, { backgroundColor: theme.onBrand }, fill]}>
        <View style={[styles.holdInner, { width }]}>
          <AppText style={styles.holdLabel} color={theme.brand}>
            {label}
          </AppText>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.gutter,
    gap: Spacing.md,
  },
  progress: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  body: { flex: 1, justifyContent: 'center', gap: Spacing.md },
  badge: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  title: { fontSize: 32, lineHeight: 38 },
  text: { fontSize: 17, lineHeight: 25 },
  button: {
    minHeight: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  hold: { borderWidth: 2, overflow: 'hidden' },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  holdInner: { position: 'absolute', left: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  holdLabel: { fontFamily: Fonts.bodySemi, fontSize: 17 },
  back: { alignSelf: 'center', minHeight: TapTarget, justifyContent: 'center', paddingHorizontal: Spacing.md },
});
