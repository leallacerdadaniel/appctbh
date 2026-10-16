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

import { Fonts, Radius, Spacing, TapTarget, Type } from '@/constants/theme';
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
  variant?: 'primary' | 'secondary';
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
          : { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line },
        inactive && { opacity: 0.55 },
      ]}>
      {loading ? (
        <ActivityIndicator color={primary ? theme.onBrand : theme.text} />
      ) : (
        <View style={styles.buttonInner}>
          {icon}
          <AppText
            style={{ fontFamily: Fonts.bodySemiBold }}
            color={primary ? theme.onBrand : theme.text}>
            {label}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}

/* ---------- Card ---------- */

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.line },
        style,
      ]}>
      {children}
    </View>
  );
}

/* ---------- Input ---------- */

export const Input = forwardRef<ComponentRef<typeof TextInput>, TextInputProps & { label: string; error?: string }>(
  function Input({ label, error, style, ...props }, ref) {
    const theme = useTheme();
    const [focused, setFocused] = useState(false);
    const borderColor = error ? theme.error : focused ? theme.text : theme.line;

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
            { color: theme.text, backgroundColor: theme.surface, borderColor },
            style,
          ]}
        />
      </View>
    );
  },
);

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

/* ---------- Avatar ---------- */

export function Avatar({ initials, size = 40 }: { initials: string; size?: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.brandSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <AppText variant="caption" color={theme.brand} style={{ fontFamily: Fonts.bodySemiBold }}>
        {initials}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
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
