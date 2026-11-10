import { Image } from 'expo-image';
import { Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandGradient } from '@/components/app-loader';
import { AppText, Button, Card } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { useHomeState } from '@/lib/home';
import { contacts } from '@/lib/mock-data';

/**
 * Shown instead of the app when the student's data can't be shown: the brand gradient with the logo, and a white card
 * saying what happened and what to do.
 */
export function HomeGate() {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const { state, reload } = useHomeState();
  const insets = useSafeAreaInsets();

  // While loading, the opening animation (AppOpening) covers the screen.
  if (state.status === 'loading') return null;

  return (
    <View style={{ flex: 1 }}>
      <BrandGradient />
      <View style={[styles.column, { paddingTop: insets.top + Spacing.xxl, paddingBottom: insets.bottom + Spacing.lg }]}>
        <Image
          source={require('@/assets/brand/logo-wordmark-white.png')}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="Chez Toi BH"
        />
        <Card style={{ gap: Spacing.md }}>
          <AppText>{state.status === 'noRental' ? t.gate.noRental : t.gate.error}</AppText>
          {state.status === 'error' && <Button label={t.gate.retry} onPress={reload} />}
          <Button
            variant="secondary"
            label="WhatsApp"
            onPress={() => Linking.openURL(`https://wa.me/${contacts.whatsapp}`)}
          />
          <Button variant="plain" label={t.profile.signOut} onPress={() => signOut()} />
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.gutter,
    gap: Spacing.xl,
  },
  logo: { width: 200, height: (200 * 143) / 810, alignSelf: 'center' },
});
