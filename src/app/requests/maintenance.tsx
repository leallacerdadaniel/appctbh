import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ChipWrap, FieldLabel, Notice, requestHref } from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { Button, Chip, InlineMessage, Input, tapFeedback } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { reportMaintenance } from '@/store/actions';
import { teamWhatsapp } from '@/store/seed';
import type { MaintenanceTicket, MaintenanceUrgency } from '@/store/types';

const ROOMS = ['bedroom', 'bathroom', 'kitchen', 'living', 'laundry', 'other'] as const;
type RoomKey = (typeof ROOMS)[number];
const CATEGORIES: MaintenanceTicket['category'][] = [
  'plumbing',
  'electrical',
  'appliance',
  'furniture',
  'internet',
  'other',
];
const URGENCIES: MaintenanceUrgency[] = ['low', 'normal', 'urgent'];
const MAX_PHOTOS = 3;

/** "Signaler un problème": where, what, how urgent, a description and up to 3 photos. */
export default function MaintenanceScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const toast = useToast();
  const r = t.requests;

  const [room, setRoom] = useState<RoomKey>('bedroom');
  const [category, setCategory] = useState<MaintenanceTicket['category']>('plumbing');
  const [urgency, setUrgency] = useState<MaintenanceUrgency>('normal');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState<string | undefined>();
  const [showMissing, setShowMissing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  async function addPhoto(source: 'camera' | 'library') {
    setPhotoError(undefined);
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoError(source === 'camera' ? r.cameraDenied : r.libraryDenied);
        return;
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;
      const uri = result.assets[0].uri;
      setPhotos((list) => [...list, uri].slice(0, MAX_PHOTOS));
    } catch {
      // Simulators without a camera land here.
      setPhotoError(source === 'camera' ? r.cameraDenied : r.libraryDenied);
    }
  }

  async function submit() {
    if (!description.trim()) {
      setShowMissing(true);
      return;
    }
    setSending(true);
    setError(false);
    try {
      const req = await reportMaintenance({
        // Stored as the student wrote it; the team reads it in the panel.
        room: r.rooms[room],
        category,
        urgency,
        description: description.trim(),
        photoUris: photos,
      });
      toast(r.sent);
      router.replace(requestHref(`/requests/${req.id}`));
    } catch {
      setError(true);
      setSending(false);
    }
  }

  return (
    <Screen back title={r.maintenanceTitle} subtitle={r.maintenanceSubtitle}>
      <Section title={r.room}>
        <ChipWrap>
          {ROOMS.map((k) => (
            <Chip key={k} label={r.rooms[k]} selected={room === k} onPress={() => setRoom(k)} />
          ))}
        </ChipWrap>
      </Section>

      <Section title={r.category}>
        <ChipWrap>
          {CATEGORIES.map((k) => (
            <Chip
              key={k}
              label={r.maintenanceCategories[k]}
              selected={category === k}
              onPress={() => setCategory(k)}
            />
          ))}
        </ChipWrap>
      </Section>

      <Section title={r.urgency}>
        <ChipWrap>
          {URGENCIES.map((k) => (
            <Chip key={k} label={r.urgencies[k]} selected={urgency === k} onPress={() => setUrgency(k)} />
          ))}
        </ChipWrap>
        {urgency === 'urgent' && (
          <View style={styles.group}>
            <Notice icon="warning" tone="warning" text={r.urgentHint} />
            <Button
              variant="secondary"
              label={r.writeWhatsapp}
              icon={<Icon name="whatsapp" size={17} color={theme.text} />}
              onPress={() => Linking.openURL(`https://wa.me/${teamWhatsapp}`)}
            />
          </View>
        )}
      </Section>

      <Input
        label={r.description}
        placeholder={r.descriptionPlaceholder}
        value={description}
        onChangeText={(v) => {
          setDescription(v);
          if (v.trim()) setShowMissing(false);
        }}
        multiline
        style={styles.multiline}
        error={showMissing ? r.descriptionMissing : undefined}
      />
      {showMissing && <InlineMessage kind="error" text={r.descriptionMissing} />}

      <View style={styles.group}>
        <FieldLabel>{r.photos}</FieldLabel>
        {photos.length > 0 && (
          <View style={styles.photos}>
            {photos.map((uri) => (
              <View key={uri} style={styles.photoBox}>
                <Image source={{ uri }} style={[styles.photo, { backgroundColor: theme.fill }]} contentFit="cover" />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={r.removePhoto}
                  hitSlop={8}
                  onPress={() => {
                    tapFeedback();
                    setPhotos((list) => list.filter((u) => u !== uri));
                  }}
                  style={[styles.remove, { backgroundColor: theme.scrim }]}>
                  <Icon name="close" size={14} color={theme.onBrand} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        {photos.length < MAX_PHOTOS && (
          <View style={styles.photoButtons}>
            <Button
              variant="secondary"
              label={r.takePhoto}
              icon={<Icon name="camera" size={17} color={theme.text} />}
              onPress={() => addPhoto('camera')}
            />
            <Button
              variant="secondary"
              label={r.pickPhoto}
              icon={<Icon name="folder" size={17} color={theme.text} />}
              onPress={() => addPhoto('library')}
            />
          </View>
        )}
        {photoError && <Notice icon="info" text={photoError} />}
      </View>

      {error && <InlineMessage kind="error" text={r.error} />}

      <Button label={r.send} onPress={submit} loading={sending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.sm },
  multiline: { minHeight: 112, paddingTop: 12, textAlignVertical: 'top' },
  photos: { flexDirection: 'row', gap: Spacing.sm },
  photoBox: { width: 96, height: 96 },
  photo: { width: 96, height: 96, borderRadius: Radius.md },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
  },
  photoButtons: { gap: Spacing.sm },
});
