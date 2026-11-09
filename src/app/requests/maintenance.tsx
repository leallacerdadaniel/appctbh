import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import {
  ChipWrap,
  FieldLabel,
  Notice,
  requestErrorText,
  useOpenSentRequest,
} from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, Chip, InlineMessage, Input, tapFeedback } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { clearMaintenancePhoto, peekMaintenancePhoto } from '@/lib/maintenance-photo';
import { contacts } from '@/lib/mock-data';
import { useRequestActions, type MaintenanceCategory, type Urgency } from '@/lib/requests';
import { trackAction } from '@/lib/usage';

const ROOMS = ['kitchen', 'bathroom', 'bedroom', 'living', 'laundry', 'other'] as const;
type Room = (typeof ROOMS)[number];
const CATEGORIES: MaintenanceCategory[] = ['plumbing', 'electrical', 'appliance', 'furniture', 'internet', 'other'];
const URGENCIES: Urgency[] = ['low', 'normal', 'urgent'];
const MAX_PHOTOS = 3;
/** What the "app-requests" function accepts; anything else is sent as JPEG. */
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];

type Photo = { uri: string; mimeType: string };
/** Photos handed over by the assistant are local files (JPEG in the cache folder, or a blob on web). */
const LOCAL_PHOTO = /^(file|blob|data|content|ph):/i;

/**
 * Pre-filled from the assistant's "Signaler à l’équipe": `/requests/maintenance?description=…` plus, when the
 * assistant could tell, `category` and `room` (values of CATEGORIES and ROOMS). The photo never comes from the
 * params (a link from outside the app could name any local file): only from handOffMaintenancePhoto.
 */
type Prefill = { description?: string; category?: string; room?: string };

/** "Signaler un problème": where, what, how urgent, a description and up to 3 photos. */
export default function MaintenanceScreen() {
  const theme = useTheme();
  const toast = useToast();
  const openSent = useOpenSentRequest();
  const { t } = useI18n();
  const r = t.requests;
  const { create, uploadPhoto } = useRequestActions();
  const prefill = useLocalSearchParams<Prefill>();

  const [room, setRoom] = useState<Room | undefined>(() => ROOMS.find((k) => k === prefill.room));
  const [category, setCategory] = useState<MaintenanceCategory | undefined>(() =>
    CATEGORIES.find((k) => k === prefill.category),
  );
  const [urgency, setUrgency] = useState<Urgency>('normal');
  const [description, setDescription] = useState(() => (prefill.description ?? '').slice(0, 1000));
  // The assistant's photo goes in the list as if it had been picked here (already a resized JPEG).
  const [photos, setPhotos] = useState<Photo[]>(() => {
    const handed = peekMaintenancePhoto();
    return handed && LOCAL_PHOTO.test(handed) ? [{ uri: handed, mimeType: 'image/jpeg' }] : [];
  });
  useEffect(() => clearMaintenancePhoto(), []);
  const [photoNotice, setPhotoNotice] = useState<{ text: string; settings: boolean } | null>(null);
  const [descriptionMissing, setDescriptionMissing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Photos already uploaded (uri → storage path), so a retry doesn't send them twice.
  const uploaded = useRef(new Map<string, string>());

  function addAssets(assets: ImagePicker.ImagePickerAsset[]) {
    const picked = assets.map((a) => ({
      uri: a.uri,
      mimeType: a.mimeType && PHOTO_TYPES.includes(a.mimeType) ? a.mimeType : 'image/jpeg',
    }));
    setPhotos((list) => [...list, ...picked].slice(0, MAX_PHOTOS));
  }

  async function takePhoto() {
    setPhotoNotice(null);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setPhotoNotice({ text: r.cameraDenied, settings: !permission.canAskAgain });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 });
      if (!result.canceled) addAssets(result.assets);
    } catch {
      // Simulators have no camera.
      setPhotoNotice({ text: r.cameraUnavailable, settings: false });
    }
  }

  async function pickPhotos() {
    setPhotoNotice(null);
    try {
      // The system photo picker needs no permission.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
        allowsMultipleSelection: true,
        selectionLimit: MAX_PHOTOS - photos.length,
      });
      if (!result.canceled) addAssets(result.assets);
    } catch {
      setPhotoNotice({ text: r.libraryError, settings: false });
    }
  }

  async function submit() {
    setError(null);
    if (!room || !category) return setError(r.errors.choiceMissing);
    if (!description.trim()) {
      setDescriptionMissing(true);
      return setError(r.descriptionMissing);
    }
    setSending(true);

    const paths: string[] = [];
    try {
      for (const [i, photo] of photos.entries()) {
        setProgress({ current: i + 1, total: photos.length });
        let path = uploaded.current.get(photo.uri);
        if (!path) {
          path = await uploadPhoto(photo.uri, photo.mimeType);
          uploaded.current.set(photo.uri, path);
        }
        paths.push(path);
      }
    } catch {
      setProgress(null);
      setError(r.errors.photos);
      setSending(false);
      return;
    }
    setProgress(null);

    try {
      const req = await create({
        kind: 'maintenance',
        // Saved as the student reads it; the team sees it in the panel.
        room: r.rooms[room],
        category,
        urgency,
        description: description.trim(),
        photoPaths: paths.length ? paths : undefined,
      });
      toast(r.sent);
      openSent(req.id);
    } catch (e) {
      setError(requestErrorText(e, t));
      setSending(false);
    }
  }

  return (
    <Screen back title={r.maintenanceTitle} subtitle={r.maintenanceSubtitle}>
      <Section title={r.problem}>
        <Card style={styles.form}>
          <View style={styles.group}>
            <FieldLabel>{r.room}</FieldLabel>
            <ChipWrap>
              {ROOMS.map((k) => (
                <Chip key={k} label={r.rooms[k]} selected={room === k} onPress={() => setRoom(k)} />
              ))}
            </ChipWrap>
          </View>

          <View style={styles.group}>
            <FieldLabel>{r.category}</FieldLabel>
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
          </View>

          <View style={styles.group}>
            <FieldLabel>{r.urgency}</FieldLabel>
            <ChipWrap>
              {URGENCIES.map((k) => (
                <Chip key={k} label={r.urgencies[k]} selected={urgency === k} onPress={() => setUrgency(k)} />
              ))}
            </ChipWrap>
            {urgency === 'urgent' && (
              <>
                <Notice icon="warning" tone="warning" text={r.urgentHint} />
                <Button
                  variant="secondary"
                  label={r.writeWhatsapp}
                  icon={<Icon name="whatsapp" size={17} color={theme.text} />}
                  onPress={() => {
                    trackAction('open_whatsapp', 'maintenance');
                    Linking.openURL(`https://wa.me/${contacts.whatsapp}`);
                  }}
                />
              </>
            )}
          </View>
        </Card>
      </Section>

      <Card style={styles.form}>
        <Input
          label={r.description}
          placeholder={r.descriptionPlaceholder}
          value={description}
          onChangeText={(v) => {
            setDescription(v);
            if (v.trim()) setDescriptionMissing(false);
          }}
          multiline
          maxLength={1000}
          style={styles.multiline}
          error={descriptionMissing ? r.descriptionMissing : undefined}
        />

        <View style={styles.group}>
          <FieldLabel hint={r.photosHint}>{r.photos}</FieldLabel>
          {photos.length > 0 && (
            <View style={styles.photos}>
              {photos.map((p) => (
                <View key={p.uri} style={styles.photoBox}>
                  <Image
                    source={{ uri: p.uri }}
                    style={[styles.photo, { backgroundColor: theme.fill }]}
                    contentFit="cover"
                  />
                  {!sending && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={r.removePhoto}
                      hitSlop={8}
                      onPress={() => {
                        tapFeedback();
                        setPhotos((list) => list.filter((x) => x.uri !== p.uri));
                      }}
                      style={[styles.remove, { backgroundColor: theme.scrim }]}>
                      <Icon name="close" size={14} color={theme.onBrand} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}
          {photos.length < MAX_PHOTOS && !sending && (
            <View style={styles.group}>
              <Button
                variant="secondary"
                label={r.takePhoto}
                icon={<Icon name="camera" size={17} color={theme.text} />}
                onPress={takePhoto}
              />
              <Button
                variant="secondary"
                label={r.pickPhoto}
                icon={<Icon name="photo" size={17} color={theme.text} />}
                onPress={pickPhotos}
              />
            </View>
          )}
          {photoNotice && (
            <>
              <Notice icon="info" text={photoNotice.text} />
              {photoNotice.settings && (
                <Button variant="plain" label={r.openSettings} onPress={() => Linking.openSettings()} />
              )}
            </>
          )}
        </View>
      </Card>

      {error && <InlineMessage kind="error" text={error} />}
      <View style={styles.group}>
        {progress && (
          <AppText variant="callout" color={theme.textSecondary} style={{ textAlign: 'center' }}>
            {r.uploading(progress.current, progress.total)}
          </AppText>
        )}
        <Button label={r.send} onPress={submit} loading={sending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.lg },
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
  },
});
