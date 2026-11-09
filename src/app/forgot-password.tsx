import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { AppText, Button, Card, InlineMessage, Input } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { appApi, AppApiError } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';
import { openWhatsApp } from '@/lib/whatsapp';

type Step = 'email' | 'code' | 'team';
type ResetError = 'invalid' | 'invalidCode' | 'expired' | 'tooShort' | 'accessEnded' | 'network' | 'server';

const KNOWN: ResetError[] = ['invalid', 'invalidCode', 'expired', 'tooShort', 'accessEnded', 'network'];
const toError = (e: unknown): ResetError =>
  e instanceof AppApiError && (KNOWN as string[]).includes(e.code) ? (e.code as ResetError) : 'server';

const MIN_LENGTH = 8;

/**
 * "Mot de passe oublié" (2026-11-09). With e-mail set up on the server, a 6-digit code arrives by e-mail and the
 * student chooses a new password here; without it, the request reaches the team (panel › Acesso ao app), who sends
 * a temporary password on WhatsApp. The server answers the same whether the account exists or not.
 */
export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { signInWithToken } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ResetError | null>(null);
  const [loading, setLoading] = useState(false);

  const rules = [
    { label: t.changePassword.ruleLength(MIN_LENGTH), ok: password.length >= MIN_LENGTH },
    { label: t.changePassword.ruleDigit, ok: /\d/.test(password) },
  ];
  const strong = rules.every((r) => r.ok);

  async function request() {
    setError(null);
    if (!email.trim().includes('@')) return setError('invalid');
    setLoading(true);
    try {
      const r = await appApi<{ channel: 'email' | 'team' }>('password-reset-request', {
        body: { email: email.trim(), lang },
      });
      setCode('');
      setStep(r.channel === 'email' ? 'code' : 'team');
    } catch (e) {
      setError(toError(e));
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    setError(null);
    if (!strong) return setError('tooShort');
    setLoading(true);
    try {
      const r = await appApi<{ token: string }>('password-reset-confirm', {
        body: { email: email.trim(), code, password },
      });
      // Signed in: the layout's guard swaps this screen for the tabs.
      signInWithToken(r.token);
    } catch (e) {
      setError(toError(e));
      setLoading(false);
    }
  }

  const whatsapp = () => openWhatsApp('forgot_password', t.forgotPassword.whatsappMessage(email.trim()));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen back title={t.forgotPassword.title}>
        <Card style={{ gap: Spacing.md }}>
          {step === 'email' && (
            <>
              <AppText color={theme.textSecondary}>{t.forgotPassword.intro}</AppText>
              <Input
                label={t.login.email}
                value={email}
                onChangeText={setEmail}
                placeholder={t.login.emailPlaceholder}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="go"
                onSubmitEditing={request}
              />
              {error && <InlineMessage kind="error" text={t.forgotPassword.errors[error]} />}
              <Button label={t.forgotPassword.send} onPress={request} loading={loading} disabled={!email.trim()} />
            </>
          )}

          {step === 'code' && (
            <>
              <InlineMessage kind="success" text={t.forgotPassword.sentEmail(email.trim())} />
              <Input
                label={t.forgotPassword.code}
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
              />
              <Input
                label={t.forgotPassword.newPassword}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="go"
                onSubmitEditing={confirm}
              />
              <View style={{ gap: Spacing.xs }}>
                {rules.map((r) => (
                  <View key={r.label} style={styles.rule}>
                    <View style={[styles.dot, { backgroundColor: r.ok ? theme.success : theme.line }]}>
                      {r.ok && <Icon name="check" size={11} color={theme.surface} />}
                    </View>
                    <AppText variant="caption" color={r.ok ? theme.text : theme.textSecondary}>
                      {r.label}
                    </AppText>
                  </View>
                ))}
              </View>
              {error && <InlineMessage kind="error" text={t.forgotPassword.errors[error]} />}
              <Button
                label={t.forgotPassword.save}
                onPress={confirm}
                loading={loading}
                disabled={code.length !== 6 || !strong}
              />
              <Button label={t.forgotPassword.resend} variant="plain" onPress={request} disabled={loading} />
            </>
          )}

          {step === 'team' && (
            <>
              <InlineMessage kind="success" text={t.forgotPassword.sentTeam} />
              <Button label={t.forgotPassword.backToLogin} onPress={() => router.back()} />
            </>
          )}
        </Card>

        <Button label={t.forgotPassword.whatsapp} variant="secondary" onPress={whatsapp} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  rule: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
