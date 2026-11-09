import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/icon';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Building blocks of the assistant chat: the student's bubble (`fill`, right), the assistant's
 * bubble (white card, left), the typing dots, suggestion pills and small text links.
 */

export function Bubble({
  from,
  children,
  accessibilityLabel,
}: {
  from: 'student' | 'assistant';
  children: ReactNode;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const student = from === 'student';
  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.bubble,
        student
          ? [styles.student, { backgroundColor: theme.fill }]
          : [styles.assistant, Shadow.card, { backgroundColor: theme.surface }],
      ]}>
      {children}
    </View>
  );
}

/** Three dots that pulse while the assistant writes (still when the system asks for less motion). */
export function TypingBubble({ label }: { label: string }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite">
      <Bubble from="assistant">
        <View style={styles.dots}>
          <Dot delay={0} />
          <Dot delay={160} />
          <Dot delay={320} />
        </View>
      </Bubble>
    </View>
  );
}

function Dot({ delay }: { delay: number }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.set(
      withDelay(
        delay,
        withRepeat(withSequence(withTiming(1, { duration: 420 }), withTiming(0.35, { duration: 420 })), -1),
      ),
    );
  }, [delay, opacity, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[styles.dot, { backgroundColor: theme.textSecondary }, style]} />;
}

/** A suggested question: white pill with a hairline (like `Chip`), wraps instead of overflowing. */
export function SuggestionPill({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={PILL_SLOP}
      style={[styles.pill, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <AppText variant="callout" style={{ fontFamily: Fonts.bodyMedium }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

/** Icon + medium text under a bubble ("Parler à l’équipe", "Réessayer"), 44 pt tall. */
export function TextLink({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} style={styles.link}>
      <Icon name={icon} size={16} color={theme.text} />
      <AppText variant="callout" style={{ fontFamily: Fonts.bodyMedium }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const PILL_HEIGHT = 36;
const PILL_SLOP = { top: (TapTarget - PILL_HEIGHT) / 2, bottom: (TapTarget - PILL_HEIGHT) / 2 };

const styles = StyleSheet.create({
  bubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: Radius.lg },
  student: { alignSelf: 'flex-end', maxWidth: '85%', borderBottomRightRadius: 6 },
  assistant: { alignSelf: 'flex-start', maxWidth: '92%', borderBottomLeftRadius: 6, gap: Spacing.sm },
  dots: { flexDirection: 'row', gap: 5, paddingVertical: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pill: {
    maxWidth: '100%',
    minHeight: PILL_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 18,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    minHeight: TapTarget,
    paddingRight: Spacing.sm,
  },
});
