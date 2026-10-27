import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';

import { BrandBar } from '@/components/brand-bar';
import { AppText, Button, Card } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { useHomeState } from '@/lib/home';
import { contacts } from '@/lib/mock-data';

/** Shown instead of the app while the student's data loads, or when it can't be shown. */
export function HomeGate() {
  const theme = useTheme();
  const { t } = useI18n();
  const { signOut } = useAuth();
  const { state, reload } = useHomeState();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <BrandBar />
      <View style={styles.column}>
        {state.status === 'loading' ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.brand} />
            <AppText color={theme.textSecondary}>{t.gate.loading}</AppText>
          </View>
        ) : (
          <Card style={{ gap: Spacing.md }}>
            <AppText>{state.status === 'noRental' ? t.gate.noRental : t.gate.error}</AppText>
            {state.status === 'error' && <Button label={t.gate.retry} onPress={reload} />}
            <Button
              variant="secondary"
              label="WhatsApp"
              onPress={() => Linking.openURL(`https://wa.me/${contacts.whatsapp}`)}
            />
            <Button variant="plain" label={t.profile.signOut} onPress={signOut} />
          </Card>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.gutter },
  center: { alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.xxl },
});
