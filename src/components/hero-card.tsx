import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { PlacePhoto } from '@/components/place-photo';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePlacePhoto } from '@/lib/place-photo';

type Photo = { uri: string } | { placeId: string };

/**
 * Large photo card with a dark layer: label, title, subtitle and a white pill button (DUO reference).
 * Photo from a URL (apartment) or from Google Maps by place id (restaurant, with the author credit).
 */
export function HeroCard({
  photo,
  label,
  labelIcon = 'star',
  title,
  subtitle,
  cta,
  onPress,
}: {
  photo: Photo;
  label: string;
  labelIcon?: IconName;
  title: string;
  subtitle?: string;
  cta: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const placeId = 'placeId' in photo ? photo.placeId : null;
  const google = usePlacePhoto(placeId ?? '', 1000);
  const author = placeId ? google?.author : null;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${title}`}
      onPress={onPress}
      style={[styles.card, Shadow.card]}>
      {placeId ? (
        <PlacePhoto placeId={placeId} width={1000} aspectRatio={16 / 10} radius={0} />
      ) : (
        <View style={[styles.photo, { backgroundColor: theme.fill }]}>
          <Image
            source={{ uri: (photo as { uri: string }).uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        </View>
      )}
      <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: theme.scrim }]}>
        <View style={[styles.label, { borderColor: theme.onBrand }]}>
          <Icon name={labelIcon} size={13} color={theme.onBrand} />
          <AppText variant="caption" color={theme.onBrand}>
            {label}
          </AppText>
        </View>
        <View style={{ gap: 2 }}>
          <AppText variant="display" color={theme.onBrand}>
            {title}
          </AppText>
          {subtitle && (
            <AppText variant="callout" color={theme.onBrandMuted}>
              {subtitle}
            </AppText>
          )}
        </View>
        <View style={styles.footer}>
          <View style={[styles.button, { backgroundColor: theme.surface }]}>
            <AppText variant="caption" style={{ fontFamily: Fonts.bodyMedium }}>
              {cta}
            </AppText>
            <Icon name="chevronRight" size={14} color={theme.text} />
          </View>
          {author && (
            <AppText color={theme.onBrandMuted} style={styles.credit}>
              © {author}
            </AppText>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, overflow: 'hidden' },
  photo: { width: '100%', aspectRatio: 16 / 10 },
  overlay: { padding: Spacing.md + 4, justifyContent: 'space-between', alignItems: 'flex-start' },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  footer: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  credit: { fontSize: 10, lineHeight: 14, maxWidth: '50%' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
});
