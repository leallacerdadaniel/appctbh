import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Screen, Section } from '@/components/screen';
import { AppText, Card, Chip, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { SERVICE_GROUPS, services, type ServiceGroup, type ServiceItem } from '@/lib/services';

/** "Applis et services": rides, delivery, banks, airlines, buses and car rental, filtered by chips. */
export default function ServicesScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const [group, setGroup] = useState<ServiceGroup | null>(null);

  const shown = group ? [group] : SERVICE_GROUPS;

  return (
    <Screen back title={t.services.title} subtitle={t.services.subtitle}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bleed}
        contentContainerStyle={styles.chips}>
        <Chip label={t.services.all} selected={group === null} onPress={() => setGroup(null)} />
        {SERVICE_GROUPS.map((g) => (
          <Chip
            key={g}
            label={t.services.groups[g]}
            selected={group === g}
            onPress={() => setGroup(group === g ? null : g)}
          />
        ))}
      </ScrollView>

      <Card style={styles.notice}>
        <Icon name="tip" size={20} color={theme.warning} />
        <AppText variant="callout" color={theme.textSecondary} style={{ flex: 1 }}>
          {t.services.cpf}
        </AppText>
      </Card>

      {shown.map((g) => (
        <Section key={g} title={t.services.groups[g]} subtitle={t.services.groupHints[g]}>
          <View style={{ gap: 12 }}>
            {services
              .filter((s) => s.group === g)
              .map((s) => (
                <ServiceRow key={s.id} service={s} />
              ))}
          </View>
        </Section>
      ))}

      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.services.source}
      </AppText>
    </Screen>
  );
}

/** Logo, name and what it is for. */
function ServiceRow({ service: s }: { service: ServiceItem }) {
  const theme = useTheme();
  const { lang } = useI18n();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${s.name}, ${s.kind[lang]}`}
      onPress={() => router.push({ pathname: '/services/[id]', params: { id: s.id } })}
      style={[styles.row, Shadow.card, { backgroundColor: theme.surface }]}>
      <Image source={s.logo} style={styles.logo} contentFit="cover" accessibilityIgnoresInvertColors />
      <View style={styles.text}>
        <AppText style={{ fontFamily: Fonts.bodyMedium }}>{s.name}</AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {s.kind[lang]}
        </AppText>
      </View>
      <Icon name="chevronRight" size={15} color={theme.textTertiary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -Spacing.gutter },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.gutter },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10, borderRadius: Radius.lg },
  logo: { width: 56, height: 56, borderRadius: Radius.md },
  text: { flex: 1, gap: 3 },
});
