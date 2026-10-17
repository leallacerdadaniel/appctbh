import { Image } from 'expo-image';
import { Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { usePlacePhoto } from '@/lib/place-photo';

/**
 * Google Maps photo of a place. The box keeps its size while loading (fill color),
 * so the screen never jumps; the image fades in once it arrives.
 * Google requires the author credit wherever a photo is shown: `credit="below"` on large photos,
 * `credit="overlay"` (tiny, on the photo) on cards.
 */
export function PlacePhoto({
  placeId,
  aspectRatio = 16 / 10,
  width = 800,
  radius = Radius.md,
  credit,
  photoIndex = 0,
}: {
  placeId: string;
  /** Which of the place's Google photos (0 = first). */
  photoIndex?: number;
  aspectRatio?: number;
  width?: number;
  radius?: number;
  credit?: 'below' | 'overlay';
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const photo = usePlacePhoto(placeId, width, photoIndex);

  return (
    <View style={{ gap: Spacing.xs }}>
      <View style={[styles.box, { aspectRatio, borderRadius: radius, backgroundColor: theme.fill }]}>
        {photo && (
          <Image
            source={{ uri: photo.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            accessibilityIgnoresInvertColors
          />
        )}
        {credit === 'overlay' && photo?.author && (
          <AppText color={theme.onBrand} style={[styles.overlayCredit, { backgroundColor: theme.scrim }]}>
            © {photo.author}
          </AppText>
        )}
      </View>
      {credit === 'below' && photo?.author && (
        <AppText
          variant="caption"
          color={theme.textTertiary}
          onPress={photo.authorUrl ? () => Linking.openURL(photo.authorUrl!) : undefined}>
          {t.restaurants.photoBy(photo.author)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', overflow: 'hidden' },
  overlayCredit: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    maxWidth: '70%',
    fontSize: 10,
    lineHeight: 14,
    paddingHorizontal: 5,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
