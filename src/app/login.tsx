import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FocusStatusBar } from '@/components/focus-status-bar';
import { LanguageSwitch } from '@/components/language-switch';
import { AppText, Button, InlineMessage, Input, PressableScale } from '@/components/ui';
import { Brand, Fonts, MaxContentWidth, Shadow, Spacing, TapTarget, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useAuth, type SignInError } from '@/lib/auth';

/** Deepest stop of the brand gradient: behind everything, so the sheet's corners never show white. */
const WINE = Brand.barGradient[2];

/**
 * Sign-in (redesigned 2026-11-09, owner: "muda pra ficar bonito"; no Charlotte at the entrance). Belo Horizonte
 * from the Serra do Curral (team photo) under the brand gradient, red at the top turning to wine behind the welcome;
 * the form in a white sheet rising from the bottom.
 */
export default function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signOutReason } = useAuth();
  const { t } = useI18n();
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<SignInError | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    const err = await signIn(email.trim(), password);
    setLoading(false);
    if (err) setError(err);
  }

  return (
    <View style={styles.root}>
      <FocusStatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Image
              source={require('@/assets/attractions/serra-curral.jpg')}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="top"
              accessible={false}
            />
            {/* The city in its own colors (a light shade at the top for the logo), then the brand red turning to
                wine behind the welcome. */}
            <LinearGradient
              colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)', 'rgba(210,11,30,0.55)', 'rgba(120,5,16,0.97)']}
              locations={[0, 0.3, 0.62, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.top, { paddingTop: insets.top + Spacing.sm }]}>
              <Image
                source={require('@/assets/brand/logo-wordmark-white.png')}
                style={styles.logo}
                contentFit="contain"
                contentPosition="left"
                accessibilityLabel="Chez Toi BH"
              />
              <LanguageSwitch onBrand />
            </View>
            <View style={styles.welcome}>
              <AppText color={theme.onBrand} style={styles.title}>
                {t.login.title}
              </AppText>
              <AppText color={theme.onBrandMuted} style={styles.subtitle}>
                {t.login.subtitle}
              </AppText>
            </View>
          </View>

          <View
            style={[
              styles.sheet,
              Shadow.floating,
              { backgroundColor: theme.surface, paddingBottom: insets.bottom + Spacing.lg },
            ]}>
            <Input
              label={t.login.email}
              value={email}
              onChangeText={setEmail}
              placeholder={t.login.emailPlaceholder}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <Input
              ref={passwordRef}
              label={t.login.password}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            {!error && signOutReason && (
              <InlineMessage
                kind={signOutReason === 'deleted' ? 'success' : 'error'}
                text={t.login.signedOut[signOutReason]}
              />
            )}
            {error && <InlineMessage kind="error" text={t.login.errors[error]} />}
            <Button label={t.login.submit} onPress={submit} loading={loading} disabled={!email || !password} />
            <PressableScale
              accessibilityRole="link"
              onPress={() => router.push('/forgot-password')}
              style={styles.forgot}>
              <AppText variant="callout" color={theme.textSecondary} style={{ fontFamily: Fonts.bodyMedium }}>
                {t.login.forgot}
              </AppText>
            </PressableScale>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const SHEET_RADIUS = 32;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: WINE },
  hero: {
    flex: 1,
    minHeight: 400,
    overflow: 'hidden',
    justifyContent: 'space-between',
    // The sheet's rounded top overlaps the photo by its radius.
    paddingBottom: SHEET_RADIUS + Spacing.lg,
  },
  top: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { width: 150, height: 28 },
  welcome: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.gutter,
    gap: Spacing.sm,
  },
  title: { ...Type.display, fontSize: 38, lineHeight: 44, letterSpacing: -1 },
  subtitle: { ...Type.body, fontSize: 16, lineHeight: 22 },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    marginTop: -SHEET_RADIUS,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  forgot: { minHeight: TapTarget, alignItems: 'center', justifyContent: 'center' },
});
