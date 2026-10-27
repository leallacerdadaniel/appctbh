import { Image } from 'expo-image';
import { useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LanguageSwitch } from '@/components/language-switch';
import { AppText, Button, Card, InlineMessage, Input } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useAuth, type SignInError } from '@/lib/auth';

/** Red band with the logo and the language switch, then the sign-in card on the gray canvas. */
export default function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + Spacing.xl }}
        keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: theme.brand, paddingTop: insets.top }}>
          <View style={styles.band}>
            <View style={styles.bandTop}>
              <LanguageSwitch onBrand />
            </View>
            <Image
              source={require('@/assets/brand/logo-wordmark-white.png')}
              style={styles.logo}
              contentFit="contain"
              accessibilityLabel="Chez Toi BH"
            />
            <View style={{ alignItems: 'center', gap: Spacing.xs }}>
              <AppText variant="display" color={theme.onBrand}>
                {t.login.title}
              </AppText>
              <AppText color={theme.onBrandMuted} style={{ textAlign: 'center' }}>
                {t.login.subtitle}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.column}>
          <Card style={{ gap: Spacing.md }}>
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
            {error && <InlineMessage kind="error" text={t.login.errors[error]} />}
            <Button
              label={t.login.submit}
              onPress={submit}
              loading={loading}
              disabled={!email || !password}
            />
            <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
              {t.login.forgot}
            </AppText>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  band: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  bandTop: { alignSelf: 'stretch', alignItems: 'flex-end' },
  logo: { width: 180, height: 32 },
  column: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
});
