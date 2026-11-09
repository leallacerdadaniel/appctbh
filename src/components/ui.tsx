import * as Haptics from 'expo-haptics';
import { forwardRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Fonts, Radius, Shadow, Spacing, TapTarget, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/* ---------- Text ---------- */

type Variant = keyof typeof Type;

export function AppText({
  variant = 'body',
  color,
  style,
  ...props
}: TextProps & { variant?: Variant; color?: string }) {
  const theme = useTheme();
  return <Text {...props} style={[Type[variant], { color: color ?? theme.text }, style]} />;
}

/* ---------- Haptics ---------- */

export function tapFeedback() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/* ---------- PressableScale: every tappable thing shrinks slightly on press ---------- */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({
  style,
  children,
  onPress,
  haptic = true,
  ...props
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; haptic?: boolean }) {
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        if (!reduceMotion) scale.set(withSpring(0.97, { damping: 20, stiffness: 400 }));
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, { damping: 15, stiffness: 300 }));
        props.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) tapFeedback();
        onPress?.(e);
      }}
      style={[style, animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
}

/* ---------- Button ---------- */

export function Button({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  icon,
}: {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'plain';
  icon?: ReactNode;
}) {
  const theme = useTheme();
  const primary = variant === 'primary';
  const inactive = disabled || loading;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={[
        styles.button,
        primary
          ? { backgroundColor: theme.brand }
          : variant === 'secondary'
            ? { backgroundColor: theme.fill }
            : { backgroundColor: 'transparent', minHeight: TapTarget, paddingHorizontal: 0 },
        inactive && { opacity: 0.55 },
      ]}>
      {loading ? (
        <ActivityIndicator color={primary ? theme.onBrand : theme.text} />
      ) : (
        <View style={styles.buttonInner}>
          {icon}
          <AppText style={{ fontFamily: Fonts.bodyMedium }} color={primary ? theme.onBrand : theme.text}>
            {label}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}

/* ---------- Card ---------- */

/** White rounded card with a soft shadow on the gray canvas. One level only. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, Shadow.card, { backgroundColor: theme.surface }, style]}>{children}</View>
  );
}

/* ---------- Chip: filter pills. White with hairline; selected = red ---------- */

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      // 36 pt pill, 44 pt touch area (rows of chips keep 8 pt between them, so slops never overlap).
      hitSlop={CHIP_SLOP}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: theme.brand, borderColor: theme.brand }
          : { backgroundColor: theme.surface, borderColor: theme.line },
      ]}>
      <AppText
        variant="callout"
        color={selected ? theme.onBrand : theme.text}
        style={{ fontFamily: Fonts.bodyMedium }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

/* ---------- Loading and retry ---------- */

/** Spinner that keeps some room while a screen's data loads (instead of a blank screen). */
export function LoadingState({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} style={styles.loading}>
      <ActivityIndicator color={theme.textSecondary} />
    </View>
  );
}

/** What couldn't load, and a way to try again. */
export function RetryCard({ message, retryLabel, onRetry }: { message: string; retryLabel: string; onRetry: () => void }) {
  const theme = useTheme();
  return (
    <Card style={{ gap: Spacing.md }}>
      <AppText color={theme.textSecondary}>{message}</AppText>
      <Button variant="secondary" label={retryLabel} onPress={onRetry} />
    </Card>
  );
}

/* ---------- Input ---------- */

export const Input = forwardRef<
  ComponentRef<typeof TextInput>,
  TextInputProps & { label: string; error?: string }
>(function Input({ label, error, style, ...props }, ref) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? theme.error : focused ? theme.text : theme.fill;

  return (
    <View style={{ gap: Spacing.xs }}>
      <AppText variant="caption" color={theme.textSecondary}>
        {label}
      </AppText>
      <TextInput
        ref={ref}
        placeholderTextColor={theme.textSecondary}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          styles.input,
          Type.body,
          { color: theme.text, backgroundColor: theme.fill, borderColor },
          style,
        ]}
      />
    </View>
  );
});

/* ---------- Inline message (errors never rely on brand red) ---------- */

export function InlineMessage({ kind, text }: { kind: 'error' | 'success'; text: string }) {
  const theme = useTheme();
  const fg = kind === 'error' ? theme.error : theme.success;
  const bg = kind === 'error' ? theme.errorSoft : theme.successSoft;
  return (
    <View accessibilityRole="alert" style={[styles.message, { backgroundColor: bg }]}>
      <AppText variant="caption" color={fg}>
        {kind === 'error' ? '⚠︎  ' : '✓  '}
        {text}
      </AppText>
    </View>
  );
}

/* ---------- Step number ---------- */

export function StepNumber({ n }: { n: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.stepNumber, { backgroundColor: theme.fill }]}>
      <AppText variant="caption" style={{ fontFamily: Fonts.bodyMedium }}>
        {n}
      </AppText>
    </View>
  );
}

/* ---------- Avatar ---------- */

export function Avatar({ initials, size = 40 }: { initials: string; size?: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.fill,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <AppText variant="caption" style={{ fontFamily: Fonts.bodyMedium }}>
        {initials}
      </AppText>
    </View>
  );
}

const CHIP_SLOP = { top: (TapTarget - 36) / 2, bottom: (TapTarget - 36) / 2 };

const styles = StyleSheet.create({
  loading: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl },
  button: {
    minHeight: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  stepNumber: { width: 24, height: 24, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  chip: {
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    // Border color already signals focus; drop the browser outline on web.
    ...({ outlineStyle: 'none' } as object),
    minHeight: TapTarget + 8,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  message: {
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
});
