import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bubble, SuggestionPill, TextLink, TypingBubble } from '@/components/assistant-ui';
import { BrandBar } from '@/components/brand-bar';
import { CharlotteFace } from '@/components/charlotte';
import { Icon } from '@/components/icon';
import { Notice } from '@/components/request-ui';
import { AppText, Button, Card, PressableScale, tapFeedback } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing, TapTarget, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import {
  MAX_PHOTO_BASE64,
  MAX_QUESTION,
  plainAnswer,
  pointsToTeam,
  preparePhoto,
  useAssistant,
  type AssistantError,
  type AssistantPhoto,
  type Exchange,
} from '@/lib/assistant';
import { openWhatsApp } from '@/lib/whatsapp';

/** Errors worth trying again as they are; the others point to the team. */
const RETRYABLE: AssistantError[] = ['busy', 'network', 'server'];
const TO_TEAM: AssistantError[] = ['notConfigured', 'limit', 'noRental'];
/** Width of the photo in the student's bubble; its height follows the photo, between 3:4 and 4:3. */
const BUBBLE_PHOTO = 200;
const photoRatio = (p: AssistantPhoto) => Math.min(4 / 3, Math.max(3 / 4, p.width / (p.height || 1)));

/**
 * The assistant: answers from the student's contract, the house rules, the BH guide and their own
 * data in the app. A chat with the composer at the bottom (not a `Screen`: no pull-to-refresh,
 * the input follows the keyboard). A question can carry one photo (camera or gallery) of something
 * wrong in the apartment; when the answer is a maintenance problem, "Signaler à l’équipe" opens the
 * maintenance request with the photo and a short description.
 */
export default function AssistantScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t, lang } = useI18n();
  const a = t.assistant;
  const r = t.requests;
  const { exchanges, pending, send, retry, clear } = useAssistant();
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<AssistantPhoto | null>(null);
  const [photoMenu, setPhotoMenu] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [photoNotice, setPhotoNotice] = useState<{ text: string; settings: boolean } | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const hasChat = exchanges.length > 0;
  // A question asked from elsewhere (Explorer's search, its suggestions): `/assistant?q=…`, sent once.
  const { q } = useLocalSearchParams<{ q?: string }>();
  const askedFromLink = useRef<string | null>(null);

  useEffect(() => {
    if (!q || askedFromLink.current === q || pending) return;
    askedFromLink.current = q;
    send(q, lang);
  }, [q, pending, send, lang]);

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  /** Sends the question; with a photo and no text, asks what is wrong in the photo. */
  function submit(question: string, withPhoto: AssistantPhoto | null = null) {
    if (pending || preparing) return;
    const asked = question.trim() || (withPhoto ? a.photoQuestion : '');
    if (!asked) return;
    send(asked, lang, withPhoto ?? undefined);
    setText('');
    if (withPhoto) setPhoto(null);
    setPhotoMenu(false);
    setPhotoNotice(null);
  }

  /** One photo from the camera or the gallery, resized for the assistant. */
  async function attach(source: 'camera' | 'library') {
    setPhotoMenu(false);
    setPhotoNotice(null);
    let result: ImagePicker.ImagePickerResult;
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setPhotoNotice({ text: r.cameraDenied, settings: !permission.canAskAgain });
          return;
        }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'] });
      } else {
        // The system photo picker needs no permission.
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
      }
    } catch {
      // Simulators have no camera.
      setPhotoNotice({ text: source === 'camera' ? r.cameraUnavailable : r.libraryError, settings: false });
      return;
    }
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;

    setPreparing(true);
    try {
      const prepared = await preparePhoto(asset.uri);
      if ((prepared.base64?.length ?? 0) > MAX_PHOTO_BASE64) {
        setPhotoNotice({ text: a.errors.imageTooBig, settings: false });
      } else {
        setPhoto(prepared);
      }
    } catch {
      setPhotoNotice({ text: a.photoFailed, settings: false });
    } finally {
      setPreparing(false);
    }
  }

  /** Opens the maintenance request with the photo, the problem in a few words and the student's own text. */
  function report(e: Exchange) {
    if (!e.maintenance) return;
    const ownWords = e.question !== a.photoQuestion;
    const description = (ownWords ? `${e.maintenance.title}\n\n${e.question}` : e.maintenance.title).slice(0, 1000);
    router.push({
      pathname: '/requests/maintenance',
      params: {
        description,
        ...(e.photo ? { photo: e.photo.uri } : {}),
        ...(e.maintenance.category ? { category: e.maintenance.category } : {}),
        ...(e.maintenance.room ? { room: e.maintenance.room } : {}),
      },
    });
  }

  const busy = pending || preparing;
  const canSend = (!!text.trim() || !!photo) && !busy;
  const canAddPhoto = !photo && !busy;
  const extras = preparing || !!photo || photoMenu || !!photoNotice;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <BrandBar back />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          // Follow the conversation; before it starts, the intro stays at the top.
          onContentSizeChange={() => hasChat && scroll.current?.scrollToEnd({ animated: true })}>
          <View style={styles.column}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <CharlotteFace size={64} sparkle />
              <View style={{ flex: 1, gap: Spacing.xs }}>
                <AppText variant="display">{a.title}</AppText>
                <AppText color={theme.textSecondary}>{a.subtitle}</AppText>
              </View>
            </View>

            <Card style={{ gap: Spacing.sm }}>
              <AppText>{a.intro}</AppText>
              <AppText>{a.photoTip}</AppText>
              <AppText variant="callout" color={theme.textSecondary}>
                {a.caution}
              </AppText>
              <AppText variant="callout" color={theme.textSecondary}>
                {a.privacy}
              </AppText>
            </Card>

            {!hasChat && (
              <View style={{ gap: Spacing.sm }}>
                <AppText variant="callout" color={theme.textSecondary}>
                  {a.examples}
                </AppText>
                <View style={styles.suggestions}>
                  {a.suggestions.map((q) => (
                    <SuggestionPill key={q} label={q} onPress={() => submit(q)} />
                  ))}
                </View>
              </View>
            )}

            {hasChat && (
              <View style={{ gap: Spacing.md }}>
                {exchanges.map((e) => (
                  <ExchangeView
                    key={e.id}
                    exchange={e}
                    onRetry={() => retry(e.id, lang)}
                    onReport={() => report(e)}
                  />
                ))}
                {!pending && <Button variant="plain" label={a.newChat} onPress={clear} />}
              </View>
            )}
          </View>
        </ScrollView>

        <View
          style={[
            styles.composer,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.line,
              paddingBottom: keyboardOpen ? Spacing.sm : Math.max(insets.bottom, Spacing.sm),
            },
          ]}>
          {extras && (
            <View style={styles.extras}>
              {preparing && (
                <View
                  accessible
                  accessibilityRole="progressbar"
                  accessibilityLabel={a.preparingPhoto}
                  style={[styles.attachment, styles.attachmentLoading, { backgroundColor: theme.fill }]}>
                  <ActivityIndicator color={theme.textSecondary} />
                </View>
              )}

              {photo && !preparing && (
                <View style={styles.attachment}>
                  <Image
                    source={{ uri: photo.uri }}
                    accessible
                    accessibilityLabel={a.yourPhoto}
                    style={[styles.attachmentPhoto, { backgroundColor: theme.fill }]}
                    contentFit="cover"
                  />
                  {!pending && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={r.removePhoto}
                      hitSlop={10}
                      onPress={() => {
                        tapFeedback();
                        setPhoto(null);
                      }}
                      style={[styles.remove, { backgroundColor: theme.scrim }]}>
                      <Icon name="close" size={14} color={theme.onBrand} />
                    </Pressable>
                  )}
                </View>
              )}

              {photoMenu && canAddPhoto && (
                <View style={styles.photoOptions}>
                  <SuggestionPill icon="camera" label={r.takePhoto} onPress={() => attach('camera')} />
                  <SuggestionPill icon="photo" label={r.pickPhoto} onPress={() => attach('library')} />
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
          )}

          <View style={styles.composerRow}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={a.addPhoto}
              accessibilityState={{ disabled: !canAddPhoto, expanded: photoMenu }}
              disabled={!canAddPhoto}
              onPress={() => {
                setPhotoNotice(null);
                setPhotoMenu((open) => !open);
              }}
              style={[styles.round, { backgroundColor: theme.fill }]}>
              <Icon name="camera" size={20} color={canAddPhoto ? theme.text : theme.textTertiary} />
            </PressableScale>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={a.placeholder}
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel={a.placeholder}
              multiline
              maxLength={MAX_QUESTION}
              style={[styles.input, Type.body, { color: theme.text, backgroundColor: theme.fill }]}
            />
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={a.send}
              accessibilityState={{ disabled: !canSend }}
              disabled={!canSend}
              onPress={() => submit(text, photo)}
              style={[styles.round, { backgroundColor: canSend ? theme.text : theme.fill }]}>
              <Icon name="send" size={20} color={canSend ? theme.surface : theme.textTertiary} />
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function ExchangeView({
  exchange: e,
  onRetry,
  onReport,
}: {
  exchange: Exchange;
  onRetry: () => void;
  onReport: () => void;
}) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const a = t.assistant;
  const colon = lang === 'fr' ? ' : ' : ': ';
  const team = <TextLink icon="whatsapp" label={a.talkToTeam} onPress={() => openWhatsApp('assistant')} />;

  return (
    <View style={{ gap: Spacing.sm }}>
      <Bubble
        from="student"
        accessibilityLabel={`${a.you}${colon}${e.photo ? `${a.yourPhoto}. ` : ''}${e.question}`}>
        {e.photo && (
          <Image
            source={{ uri: e.photo.uri }}
            style={[styles.bubblePhoto, { aspectRatio: photoRatio(e.photo), backgroundColor: theme.surface }]}
            contentFit="cover"
          />
        )}
        <AppText>{e.question}</AppText>
      </Bubble>

      {e.status === 'pending' && <TypingBubble label={a.thinking} />}

      {e.status === 'answered' && e.answer && (
        <>
          <Bubble from="assistant">
            <AppText selectable>{plainAnswer(e.answer)}</AppText>
          </Bubble>
          {e.maintenance && (
            <View style={styles.report}>
              <Button
                variant="secondary"
                label={a.reportToTeam}
                icon={<Icon name="wrench" size={17} color={theme.text} />}
                onPress={onReport}
              />
            </View>
          )}
          {pointsToTeam(e.answer) && team}
        </>
      )}

      {e.status === 'refused' && (
        <>
          <Bubble from="assistant">
            <AppText>{a.refused}</AppText>
          </Bubble>
          {team}
        </>
      )}

      {e.status === 'error' && (
        <>
          <Bubble from="assistant">
            <View accessibilityRole="alert" style={styles.error}>
              <Icon name="warning" size={18} color={theme.error} />
              {/* flexShrink, not flex: 1 — inside a shrink-wrapped bubble flex: 1 gives the text zero width. */}
              <AppText variant="callout" color={theme.error} style={{ flexShrink: 1 }}>
                {a.errors[e.error ?? 'server']}
              </AppText>
            </View>
          </Bubble>
          {RETRYABLE.includes(e.error ?? 'server') && <TextLink icon="retry" label={a.retry} onPress={onRetry} />}
          {TO_TEAM.includes(e.error ?? 'server') && team}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  bubblePhoto: { width: BUBBLE_PHOTO, borderRadius: Radius.md },
  report: { alignSelf: 'flex-start' },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.sm },
  extras: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.gutter - 4,
    paddingBottom: Spacing.sm,
  },
  attachment: { width: 72, height: 72 },
  attachmentLoading: { borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  attachmentPhoto: { width: 72, height: 72, borderRadius: Radius.md },
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
  photoOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  composerRow: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.gutter - 4,
  },
  input: {
    // No browser outline on web; the field is already on `fill`.
    ...({ outlineStyle: 'none' } as object),
    flex: 1,
    minHeight: TapTarget,
    maxHeight: 132,
    borderRadius: 22,
    paddingHorizontal: Spacing.md,
    paddingTop: 11,
    paddingBottom: 11,
    textAlignVertical: 'top',
  },
  round: {
    width: TapTarget,
    height: TapTarget,
    borderRadius: TapTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
