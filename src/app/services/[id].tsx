import { Image } from 'expo-image';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen } from '@/components/screen';
import { AppText, Card } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { appUrl, getService } from '@/lib/services';

export default function ServiceScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = getService(id);

  if (!s) return <Redirect href="/services" />;

  return (
    <Screen back title={s.name} subtitle={s.kind[lang]}>
      <Image
        source={s.logo}
        style={styles.logo}
        contentFit="cover"
        accessibilityLabel={s.name}
        accessibilityIgnoresInvertColors
      />

      <AppText style={{ lineHeight: 23 }}>{s.description[lang]}</AppText>

      <Card style={styles.tip}>
        <Icon name="tip" size={20} color={theme.warning} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" color={theme.textSecondary}>
            {t.travel.tip}
          </AppText>
          <AppText>{s.tip[lang]}</AppText>
        </View>
      </Card>

      <Card style={{ paddingVertical: 0 }}>
        <ListGroup inset>
          <ListRow icon="download" title={t.services.app} onPress={() => Linking.openURL(appUrl(s))} />
          <ListRow icon="website" title={t.services.website} onPress={() => Linking.openURL(s.website)} />
        </ListGroup>
      </Card>

      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.services.source}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  logo: { width: 88, height: 88, borderRadius: Radius.md },
});
