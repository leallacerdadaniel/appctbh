import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, useState, type ComponentRef, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { AppText, PressableScale } from '@/components/ui';
import { Brand, Fonts, Radius, Spacing, TapTarget, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

/**
 * The sign-in family (login, first access, forgot password), redesigned 2026-11-09 ("essa parte branca poderia ser
 * mais bonitinha"): fields with an icon inside a soft pill, a show/hide eye on passwords, the brand gradient on the
 * main button, and an "ou" divider.
 */

/** Deepest stop of the brand gradient: behind the sign-in screens, so the sheet's corners never show white. */
export const AUTH_WINE = Brand.barGradient[2];

/**
 * Belo Horizonte from the Serra do Curral (team photo), in its own colors at the top (a light shade for the logo),
 * then the brand red turning to wine behind the text. Fills its parent; put it first in a view with overflow hidden.
 */
export function AuthBackdrop() {
  return (
    <>
      <Image
        source={require('@/assets/attractions/serra-curral.jpg')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="top"
        accessible={false}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)', 'rgba(210,11,30,0.55)', 'rgba(120,5,16,0.97)']}
        locations={[0, 0.3, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />
    </>
  );
}

/** A field with its icon inside: label above, 56 pt pill, red ring when focused. `secure` adds the eye. */
export const AuthField = forwardRef<
  ComponentRef<typeof TextInput>,
  TextInputProps & { label: string; icon: IconName; secure?: boolean; accessory?: ReactNode }
>(function AuthField({ label, icon, secure = false, accessory, style, ...props }, ref) {
  const theme = useTheme();
  const { t } = useI18n();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View style={{ gap: Spacing.xs }}>
      <View style={styles.labelRow}>
        <AppText variant="caption" color={theme.textSecondary} style={{ fontFamily: Fonts.bodyMedium }}>
          {label}
        </AppText>
        {accessory}
      </View>
      <View
        style={[
          styles.field,
          {
            backgroundColor: focused ? theme.surface : theme.fill,
            borderColor: focused ? theme.brand : 'transparent',
          },
        ]}>
        <Icon name={icon} size={18} color={focused ? theme.brand : theme.textSecondary} />
        <TextInput
          ref={ref}
          placeholderTextColor={theme.textTertiary}
          secureTextEntry={secure && hidden}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[styles.input, Type.body, { color: theme.text }, style]}
        />
        {secure && (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={hidden ? t.auth.showPassword : t.auth.hidePassword}
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            haptic={false}
            style={styles.eye}>
            <Icon name={hidden ? 'show' : 'hide'} size={18} color={theme.textSecondary} />
          </PressableScale>
        )}
      </View>
    </View>
  );
});

/** The main action: brand gradient pill, white label, an arrow; faded while disabled. */
export function GradientButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const off = disabled || loading;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={[styles.button, { opacity: disabled ? 0.45 : 1 }]}>
      <LinearGradient
        colors={Brand.barGradient}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {loading ? (
        <ActivityIndicator color={theme.onBrand} />
      ) : (
        <View style={styles.buttonContent}>
          <AppText color={theme.onBrand} style={styles.buttonLabel}>
            {label}
          </AppText>
          <Icon name="chevronRight" size={18} color={theme.onBrand} />
        </View>
      )}
    </PressableScale>
  );
}

/** "ou" between two ways in. */
export function AuthDivider({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.divider}>
      <View style={[styles.line, { backgroundColor: theme.line }]} />
      <AppText variant="caption" color={theme.textTertiary}>
        {label}
      </AppText>
      <View style={[styles.line, { backgroundColor: theme.line }]} />
    </View>
  );
}

/** A quiet secondary way in: white pill with a hairline, icon and label. */
export function OutlineButton({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.outline, { borderColor: theme.line, backgroundColor: theme.surface }]}>
      <Icon name={icon} size={18} color={theme.brand} />
      <AppText style={{ fontFamily: Fonts.bodyMedium }}>{label}</AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 18 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 56,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  input: { flex: 1, height: '100%', paddingVertical: 0 },
  eye: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginRight: -6 },
  button: {
    height: 56,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(176, 9, 24, 0.28)',
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  buttonLabel: { ...Type.body, fontFamily: Fonts.bodyMedium, fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  line: { flex: 1, height: 1 },
  outline: {
    height: 52,
    minHeight: TapTarget,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
});
