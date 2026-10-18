import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PlacePhoto } from '@/components/place-photo';
import { Screen, Section } from '@/components/screen';
import { AppText, Card, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { WALK_LIMIT_MIN } from '@/lib/nearby';
import { NIGHT_KINDS, nightPlaces, type NightPlace } from '@/lib/nightlife';

/** "Sortir le soir": bars and clubs, with the reminder that many BH parties are one-offs. */
export default function NightlifeScreen() {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <Screen back title={t.nightlife.title} subtitle={t.nightlife.subtitle}>
      <Card style={styles.notice}>
        <Icon name="tip" size={20} color={theme.warning} />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText style={{ fontFamily: Fonts.bodyMedium }}>{t.nightlife.noticeTitle}</AppText>
          <AppText variant="callout" color={theme.textSecondary}>
            {t.nightlife.notice}
          </AppText>
        </View>
      </Card>

      {NIGHT_KINDS.map((kind) => (
        <Section key={kind} title={t.nightlife.kinds[kind]} subtitle={t.nightlife.kindHints[kind]}>
          {kind === 'club' && (
            <Card style={styles.notice}>
              <Icon name="rent" size={20} color={theme.textSecondary} />
              <AppText variant="callout" color={theme.textSecondary} style={{ flex: 1 }}>
                {t.nightlife.tickets}
              </AppText>
            </Card>
          )}
          <View style={{ gap: 12 }}>
            {nightPlaces
              .filter((p) => p.kind === kind)
              .map((p) => (
                <NightRow key={p.id} place={p} />
              ))}
          </View>
        </Section>
      ))}

      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.nightlife.source}
      </AppText>
    </Screen>
  );
}

/** Same row as the restaurants: square photo, name, vibe, area • distance, when to go. */
function NightRow({ place: p }: { place: NightPlace }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const far = p.walkMin != null && p.walkMin > WALK_LIMIT_MIN;
  const distance =
    p.walkMin == null ? null : far && p.driveMin != null ? t.restaurants.drive(p.driveMin) : t.restaurants.walk(p.walkMin);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${p.name}, ${p.vibe[lang]}, ${p.neighborhood}`}
      onPress={() => router.push({ pathname: '/nightlife/[id]', params: { id: p.id } })}
      style={[styles.row, Shadow.card, { backgroundColor: theme.surface }]}>
      <View style={styles.thumb}>
        <PlacePhoto placeId={p.placeId} source={p.photo} width={300} aspectRatio={1} radius={Radius.md} />
      </View>
      <View style={styles.text}>
        <AppText style={{ fontFamily: Fonts.bodyMedium }}>{p.name}</AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {p.vibe[lang]}
        </AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {p.neighborhood}
          {distance ? ` • ${distance}` : ''}
        </AppText>
        {p.closed ? (
          <View style={[styles.closed, { backgroundColor: theme.fill }]}>
            <AppText variant="caption" color={theme.text}>
              {p.closed[lang]}
            </AppText>
          </View>
        ) : (
          <View style={styles.line}>
            <Icon name="clock" size={13} color={theme.textSecondary} />
            <AppText variant="caption" color={theme.textSecondary} style={{ flex: 1 }}>
              {p.when[lang]}
            </AppText>
          </View>
        )}
      </View>
      <Icon name="chevronRight" size={15} color={theme.textTertiary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10, borderRadius: Radius.lg },
  thumb: { width: 92 },
  text: { flex: 1, gap: 3 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  closed: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, marginTop: 2 },
});
