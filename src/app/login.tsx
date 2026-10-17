import { Image } from 'expo-image';
import { useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LanguageSwitch } from '@/components/language-switch';
import { AppText, Button, InlineMessage, Input } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { DEMO_TEMP_PASSWORD, useAuth, type SignInError } from '@/lib/auth';

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
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <LanguageSwitch />
        </View>

        <Animated.View entering={FadeInUp.duration(450)} style={styles.brand}>
          <Image
            source={require('@/assets/brand/logo-tile.png')}
            style={styles.tile}
            contentFit="cover"
            accessibilityLabel="Chez Toi BH"
          />
          <View style={{ alignItems: 'center', gap: Spacing.xs }}>
            <AppText variant="display">{t.login.title}</AppText>
            <AppText color={theme.textSecondary} style={{ textAlign: 'center' }}>
              {t.login.subtitle}
            </AppText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.form}>
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
          <Button label={t.login.submit} onPress={submit} loading={loading} disabled={!email || !password} />
          <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
            {t.login.forgot}
          </AppText>
        </Animated.View>

        <View style={[styles.demo, { borderColor: theme.line }]}>
          <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
            {t.login.demo(DEMO_TEMP_PASSWORD)}
          </AppText>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
  },
  topBar: { alignItems: 'flex-end' },
  brand: { alignItems: 'center', gap: Spacing.lg },
  tile: { width: 96, height: 96, borderRadius: Radius.lg },
  form: { gap: Spacing.md },
  demo: {
    marginTop: 'auto',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
});
