import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { AppText, Card, PressableScale } from '@/components/ui';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useHome } from '@/lib/home';

/** Trash instructions for this apartment, entered in the admin: text in the app's language + photos. */
export default function TrashScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t, lang } = useI18n();
  const { trash } = useHome().apartment;
  const [zoomed, setZoomed] = useState<string | null>(null);
  const text = trash?.text[lang];

  return (
    <Screen back title={t.apartment.trash.title} subtitle={t.apartment.trash.subtitle}>
      {!!text && (
        <Card>
          <AppText>{text}</AppText>
        </Card>
      )}

      {trash?.photos.map((url) => (
        <PressableScale
          key={url}
          accessibilityRole="imagebutton"
          accessibilityLabel={t.apartment.trash.enlarge}
          onPress={() => setZoomed(url)}
          style={[styles.photo, Shadow.card, { backgroundColor: theme.fill }]}>
          <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        </PressableScale>
      ))}

      <Modal visible={!!zoomed} transparent animationType="fade" onRequestClose={() => setZoomed(null)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.apartment.trash.close}
          onPress={() => setZoomed(null)}
          style={[styles.zoom, { backgroundColor: theme.text }]}>
          {zoomed && <Image source={{ uri: zoomed }} style={StyleSheet.absoluteFill} contentFit="contain" />}
          <View style={[styles.close, { top: insets.top + Spacing.md, backgroundColor: theme.scrim }]}>
            <Icon name="close" size={20} color={theme.surface} />
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.lg, overflow: 'hidden' },
  zoom: { flex: 1 },
  close: {
    position: 'absolute',
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
