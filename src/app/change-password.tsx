import { Check, KeyRound } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, InlineMessage, Input } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { DEMO_TEMP_PASSWORD, useAuth } from '@/lib/auth';
import { demoStudent } from '@/lib/mock-data';

const MIN_LENGTH = 8;

export default function ChangePasswordScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { changePassword } = useAuth();
  const { t } = useI18n();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const rules = [
    { ok: password.length >= MIN_LENGTH, label: t.changePassword.ruleLength(MIN_LENGTH) },
    { ok: /\d/.test(password), label: t.changePassword.ruleDigit },
    { ok: password.length > 0 && password !== DEMO_TEMP_PASSWORD, label: t.changePassword.ruleDifferent },
  ];
  const valid = rules.every((r) => r.ok) && password === confirm;
  const mismatch = confirm.length > 0 && password !== confirm;

  async function submit() {
    setLoading(true);
    // Show the success state briefly before the guard swaps to the tabs.
    setDone(true);
    await new Promise((r) => setTimeout(r, 900));
    await changePassword(password);
  }

  if (done) {
    return (
      <View style={[styles.success, { backgroundColor: theme.background }]}>
        <Animated.View
          entering={ZoomIn.springify().damping(12)}
          style={[styles.successIcon, { backgroundColor: theme.successSoft }]}>
          <Check size={40} color={theme.success} strokeWidth={2.5} />
        </Animated.View>
        <Animated.View entering={FadeIn.delay(200)}>
          <AppText variant="heading">{t.changePassword.saved}</AppText>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + Spacing.xxl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(400)} style={{ gap: Spacing.md }}>
          <View style={[styles.icon, { backgroundColor: theme.brandSoft }]}>
            <KeyRound size={26} color={theme.brand} />
          </View>
          <AppText variant="title">{t.changePassword.hello(demoStudent.firstName)}</AppText>
          <AppText color={theme.textSecondary}>
            {t.changePassword.intro}
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ gap: Spacing.md }}>
          <Input
            label={t.changePassword.newPassword}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          <View style={{ gap: Spacing.xs }}>
            {rules.map((r) => (
              <View key={r.label} style={styles.rule}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: r.ok ? theme.success : theme.line },
                  ]}>
                  {r.ok && <Check size={10} color="#fff" strokeWidth={3} />}
                </View>
                <AppText variant="caption" color={r.ok ? theme.text : theme.textSecondary}>
                  {r.label}
                </AppText>
              </View>
            ))}
          </View>
          <Input
            label={t.changePassword.confirm}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
            error={mismatch ? 'mismatch' : undefined}
          />
          {mismatch && <InlineMessage kind="error" text={t.changePassword.mismatch} />}
          <Button label={t.changePassword.save} onPress={submit} loading={loading} disabled={!valid} />
        </Animated.View>
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
  icon: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rule: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
