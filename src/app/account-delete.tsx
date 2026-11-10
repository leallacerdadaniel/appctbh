import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Screen, Section } from '@/components/screen';
import { AppText, Button, Card, InlineMessage, Input } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useAuth, type DeleteAccountError } from '@/lib/auth';
import { useHome } from '@/lib/home';
import { deleteRecapPhotos } from '@/lib/journal';

/**
 * Delete the app account from the app itself (App Store and Google Play requirement, 2026-11-09). Says plainly
 * what goes and what Chez Toi keeps, asks for the password and a last confirmation, then signs out.
 */
export default function AccountDeleteScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { deleteAccount } = useAuth();
  const { student } = useHome();
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<DeleteAccountError | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (loading) return;
    setLoading(true);
    setError(null);
    const email = student.email;
    const err = await deleteAccount(password, reason.trim() || undefined);
    // On success the session ends and the layout shows the login screen with a goodbye message.
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      // The screen promises the journal and the recap go too: that includes the photo copies on this phone.
      deleteRecapPhotos(email);
    }
  }

  function ask() {
    Alert.alert(t.account.confirmTitle, t.account.confirmBody, [
      { text: t.account.cancel, style: 'cancel' },
      { text: t.account.confirm, style: 'destructive', onPress: run },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen back title={t.account.title} subtitle={t.account.intro}>
        <Section title={t.account.deletedTitle}>
          <Card style={{ gap: Spacing.sm }}>
            {t.account.deleted.map((line) => (
              <View key={line} style={styles.line}>
                <Icon name="close" size={16} color={theme.error} />
                <AppText style={{ flex: 1 }}>{line}</AppText>
              </View>
            ))}
          </Card>
        </Section>

        <Section title={t.account.keptTitle}>
          <Card style={{ gap: Spacing.sm }}>
            {t.account.kept.map((line) => (
              <View key={line} style={styles.line}>
                <Icon name="check" size={16} color={theme.textSecondary} />
                <AppText style={{ flex: 1 }} color={theme.textSecondary}>
                  {line}
                </AppText>
              </View>
            ))}
          </Card>
        </Section>

        <Card style={{ gap: Spacing.md }}>
          <Input
            label={t.account.reason}
            value={reason}
            onChangeText={setReason}
            multiline
            maxLength={500}
            style={{ minHeight: 72, textAlignVertical: 'top' }}
          />
          <Input
            label={t.account.password}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
          />
          {error && (
            <InlineMessage kind="error" text={error === 'links' ? t.common.noLinks : t.account.errors[error]} />
          )}
          <Button label={t.account.confirm} onPress={ask} loading={loading} disabled={!password} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
});
