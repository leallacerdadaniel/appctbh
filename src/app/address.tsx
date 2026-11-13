import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FocusStatusBar } from '@/components/focus-status-bar';
import { fullAddress } from '@/components/home-v3';
import { Icon } from '@/components/icon';
import { useToast } from '@/components/toast';
import { AppText, Button, PressableScale } from '@/components/ui';
import { Fonts, MaxContentWidth, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useHome } from '@/lib/home';

/**
 * "Montrer au chauffeur" (v3): the address in large type, with a line in Portuguese for the driver.
 * Opened from the address card on Accueil.
 */
export default function ShowAddressScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { t } = useI18n();
  const { apartment } = useHome();
  const address = fullAddress(apartment);

  return (
    <View style={[styles.screen, { backgroundColor: theme.surface, paddingTop: insets.top + Spacing.sm, paddingBottom: insets.bottom + Spacing.lg }]}>
      <FocusStatusBar style="dark" />
      <View style={styles.top}>
        <AppText variant="callout" color={theme.textSecondary} style={{ flex: 1 }}>
          {t.showAddress.hint}
        </AppText>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t.showAddress.close}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={[styles.close, { backgroundColor: theme.background }]}>
          <Icon name="close" size={18} color={theme.text} />
        </PressableScale>
      </View>
      <View style={styles.body}>
        <AppText variant="title" color={theme.brand}>
          {t.showAddress.toDriver}
        </AppText>
        <AppText selectable style={[styles.address, { color: theme.text }]}>
          {address}
        </AppText>
      </View>
      <Button
        label={t.showAddress.copy}
        variant="secondary"
        onPress={async () => {
          await Clipboard.setStringAsync(address);
          toast(t.today.addressCopied);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: Spacing.gutter, gap: Spacing.lg, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  close: { width: TapTarget, height: TapTarget, borderRadius: TapTarget / 2, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, justifyContent: 'center', gap: Spacing.md },
  address: { fontFamily: Fonts.display, fontSize: 34, lineHeight: 42, letterSpacing: -0.5 },
});
