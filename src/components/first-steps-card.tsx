import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { getService } from '@/lib/services';

/**
 * "Premiers pas au Brésil" on Accueil: three app logos, the title, the hint; the card opens the page, the cross on
 * the right hides it (two buttons side by side, never one inside the other). See `useFirstStepsCard`.
 */
export function FirstStepsCard({ onHide }: { onHide: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  const e = t.explorerTab;
  const logos = ['uber', 'ifood', 'nubank'].map((id) => getService(id)?.logo).filter((l): l is number => l != null);
  return (
    <View style={[styles.card, { backgroundColor: theme.brandSoft }]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${e.firstSteps}. ${e.firstStepsHint}`}
        onPress={() => router.push('/first-steps' as Href)}
        style={styles.open}>
        <View style={{ flexDirection: 'row' }}>
          {logos.map((logo, i) => (
            <Image
              key={i}
              source={logo}
              style={[styles.logo, { marginLeft: i ? -6 : 0, borderColor: theme.brandSoft }]}
              contentFit="cover"
              accessible={false}
            />
          ))}
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <AppText style={{ fontFamily: Fonts.bodySemi }}>{e.firstSteps}</AppText>
          <AppText variant="caption" color={theme.textSecondary}>
            {e.firstStepsHint}
          </AppText>
        </View>
        <Icon name="chevronRight" size={16} color={theme.brand} />
      </PressableScale>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={e.firstStepsHide}
        onPress={onHide}
        hitSlop={8}
        style={styles.close}>
        <Icon name="close" size={16} color={theme.textSecondary} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, paddingRight: Spacing.xs },
  open: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  logo: { width: 28, height: 28, borderRadius: 8, borderWidth: 2 },
  close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
