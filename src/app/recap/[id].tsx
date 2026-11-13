import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { AccessibilityInfo, ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { FocusStatusBar } from '@/components/focus-status-bar';
import {
  Backdrop,
  CloseButton,
  ClosingSlide,
  DaysSlide,
  IntroSlide,
  MixSlide,
  NeighborhoodSlide,
  NextSlide,
  PhotosSlide,
  PlacesSlide,
  PortugueseSlide,
  RecapLogo,
  ShareCardPreview,
  SLIDE_THEMES,
  slideThemes,
  StoryBars,
  StoryButton,
  StoryLink,
  TopSlide,
  type SlideTheme,
  type ViewRef,
} from '@/components/recap-ui';
import { AppText } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useJournalTracker } from '@/lib/journal';
import { parseRecapId, recapSlides, useRecap, type RecapData, type SlideKind } from '@/lib/recap';
import { canShareImage, shareCardImage } from '@/lib/recap-share';

/** How long a slide stays before the next one (Instagram-like); holding a finger pauses it. */
const SLIDE_MS = 6500;
/** Space for the bars, the logo and the close button above the slide's content. */
const TOP = 72;

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/**
 * A recap as full-screen stories (owner, 2026-11-08: "pensa no recap do Spotify"): `/recap/2026-10` for a
 * month, `/recap/semester` for the stay. One big fact per slide, then a card to share on Instagram.
 * Tap on the right two thirds to go on, on the left third to go back; slides move on by themselves unless
 * reduced motion or a screen reader is on.
 */
export default function RecapStoryScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  useJournalTracker();
  const [scope] = useState(() => parseRecapId(id));
  const recap = useRecap(scope);
  // The first complete data is kept: slides never shift while the student watches.
  const [data, setData] = useState<RecapData | null>(null);
  if (recap.data && !data) setData(recap.data);

  if (!data) {
    const theme = SLIDE_THEMES[0];
    const missing = recap.ready && !recap.range;
    return (
      <View style={{ flex: 1 }}>
        <FocusStatusBar style="light" />
        <Backdrop theme={theme} />
        <View style={[styles.topRow, styles.column, { paddingTop: insets.top + Spacing.md }]}>
          <RecapLogo theme={theme} />
          <CloseButton theme={theme} onPress={close} />
        </View>
        <View
          style={styles.loading}
          accessible
          accessibilityRole={missing ? 'text' : 'progressbar'}
          accessibilityLabel={missing ? t.recap.notFound : t.recap.loading}>
          {!missing && <ActivityIndicator color={theme.fg} />}
          <AppText color={theme.muted}>{missing ? t.recap.notFound : t.recap.loading}</AppText>
        </View>
      </View>
    );
  }

  return <Story data={data} />;
}

function useScreenReader() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled().then((v) => alive && setOn(v));
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return on;
}

function Story({ data }: { data: RecapData }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const screenReader = useScreenReader();
  const autoplay = !reduceMotion && !screenReader;

  const [slides] = useState(() => recapSlides(data));
  const [themes] = useState(() => slideThemes(slides));
  const last = slides.length - 1;
  // `run` changes on every move, so going to the same slide (back on the first) restarts its timer too.
  const [pos, setPos] = useState({ index: 0, run: 0 });
  const [paused, setPaused] = useState(false);
  const progress = useSharedValue(0);
  const current = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  const kind: SlideKind = slides[pos.index];
  const isLast = pos.index === last;
  const theme = themes[pos.index];

  const goTo = useCallback(
    (to: (index: number) => number) => {
      cancelAnimation(progress);
      progress.set(0);
      setPaused(false);
      setPos((p) => ({ index: Math.max(0, Math.min(last, to(p.index))), run: p.run + 1 }));
    },
    [last, progress],
  );
  const next = useCallback(() => goTo((i) => i + 1), [goTo]);
  const previous = useCallback(() => goTo((i) => i - 1), [goTo]);

  useEffect(() => {
    // The share slide waits for the student; without autoplay the current bar is simply full.
    if (isLast || !autoplay) {
      cancelAnimation(progress);
      progress.set(1);
      return;
    }
    if (paused) {
      cancelAnimation(progress);
      return;
    }
    const from = progress.get();
    progress.set(
      withTiming(1, { duration: SLIDE_MS * (1 - from), easing: Easing.linear }, (finished) => {
        if (finished) scheduleOnRN(next);
      }),
    );
    return () => cancelAnimation(progress);
  }, [pos.run, paused, autoplay, isLast, next, progress]);

  // With a screen reader, the new slide is read as soon as it shows.
  const content = useRef<ViewRef>(null);
  useEffect(() => {
    if (screenReader && content.current) AccessibilityInfo.sendAccessibilityEvent(content.current, 'focus');
  }, [pos.run, screenReader]);

  const pressZone = {
    onPressIn: () => setPaused(true),
    onPressOut: () => setPaused(false),
    // A long press only pauses (Instagram), it doesn't move.
    onLongPress: () => {},
    delayLongPress: 300,
  };

  const padding = { paddingTop: insets.top + TOP, paddingBottom: insets.bottom + Spacing.xl };

  return (
    <View style={{ flex: 1 }}>
      <FocusStatusBar style={theme.dark ? 'dark' : 'light'} />
      <Backdrop theme={theme} />

      {kind !== 'share' && (
        <Animated.View
          key={pos.run}
          entering={reduceMotion ? undefined : FadeIn.duration(220)}
          pointerEvents="none"
          style={styles.layer}>
          <View style={[styles.column, styles.slide, padding]}>
            <View ref={content} accessible>
              <Slide kind={kind} data={data} theme={theme} />
            </View>
          </View>
        </Animated.View>
      )}

      <View style={[StyleSheet.absoluteFill, styles.zones]}>
        <Pressable
          {...pressZone}
          accessibilityRole="button"
          accessibilityLabel={t.recap.previous}
          accessibilityState={{ disabled: pos.index === 0 }}
          onPress={previous}
          style={{ flex: 1 }}
        />
        <Pressable
          {...pressZone}
          accessibilityRole="button"
          accessibilityLabel={t.recap.next}
          accessibilityState={{ disabled: isLast }}
          onPress={isLast ? undefined : next}
          style={{ flex: 2 }}
        />
      </View>

      {kind === 'share' && (
        <Animated.View
          key={pos.run}
          entering={reduceMotion ? undefined : FadeIn.duration(220)}
          pointerEvents="box-none"
          style={styles.layer}>
          <View pointerEvents="box-none" style={[styles.column, styles.share, padding]}>
            <ShareSlide data={data} theme={theme} onRestart={() => goTo(() => 0)} focusRef={content} />
          </View>
        </Animated.View>
      )}

      <View pointerEvents="box-none" style={styles.top}>
        <View pointerEvents="box-none" style={[styles.column, styles.topInner, { paddingTop: insets.top + Spacing.sm }]}>
          <StoryBars
            count={slides.length}
            index={pos.index}
            theme={theme}
            label={t.recap.step(pos.index + 1, slides.length)}
            current={<Animated.View style={[styles.fill, { backgroundColor: theme.fg }, current]} />}
          />
          <View style={styles.topRow} pointerEvents="box-none">
            <RecapLogo theme={theme} />
            <CloseButton theme={theme} onPress={close} />
          </View>
        </View>
      </View>
    </View>
  );
}

function Slide({ kind, data, theme }: { kind: SlideKind; data: RecapData; theme: SlideTheme }) {
  switch (kind) {
    case 'intro':
      return <IntroSlide data={data} theme={theme} />;
    case 'days':
      return <DaysSlide data={data} theme={theme} />;
    case 'places':
      return <PlacesSlide data={data} theme={theme} />;
    case 'top':
      return <TopSlide data={data} theme={theme} />;
    case 'neighborhood':
      return <NeighborhoodSlide data={data} theme={theme} />;
    case 'mix':
      return <MixSlide data={data} theme={theme} />;
    case 'portuguese':
      return <PortugueseSlide data={data} theme={theme} />;
    case 'photos':
      return <PhotosSlide data={data} theme={theme} />;
    case 'next':
      return <NextSlide data={data} theme={theme} />;
    default:
      return <ClosingSlide data={data} theme={theme} />;
  }
}

/** Last slide: the card as it will be posted, the share button, and a way to watch again. */
function ShareSlide({
  data,
  theme,
  onRestart,
  focusRef,
}: {
  data: RecapData;
  theme: SlideTheme;
  onRestart: () => void;
  focusRef: RefObject<ViewRef | null>;
}) {
  const { t } = useI18n();
  const s = t.recap.share;
  const card = useRef<ViewRef>(null);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    setError(null);
    setSharing(true);
    try {
      await shareCardImage(card, s.dialogTitle);
    } catch (e) {
      setError(e instanceof Error && e.message === 'unavailable' ? s.unavailable : s.error);
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      <View ref={focusRef} accessible pointerEvents="none" style={{ gap: Spacing.xs }}>
        <AppText variant="display" color={theme.fg}>
          {s.title}
        </AppText>
        <AppText color={theme.muted}>{canShareImage ? s.hint : s.unavailable}</AppText>
      </View>
      <View pointerEvents="none" style={styles.previewArea}>
        <ShareCardPreview data={data} cardRef={card} />
      </View>
      {error && (
        <AppText accessibilityRole="alert" color={theme.fg} style={{ textAlign: 'center' }}>
          {error}
        </AppText>
      )}
      {canShareImage && <StoryButton label={s.button} icon="share" theme={theme} loading={sharing} onPress={share} />}
      <View style={styles.links} pointerEvents="box-none">
        <StoryLink label={s.again} theme={theme} onPress={onRestart} />
        <StoryLink label={t.recap.allRecaps} theme={theme} onPress={() => router.replace('/recap')} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.lg },
  /** Full-screen layer that centers the column (wide screens). */
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center' },
  slide: { flex: 1, justifyContent: 'center' },
  share: { flex: 1, gap: Spacing.sm },
  zones: { flexDirection: 'row' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  topInner: { gap: Spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg },
  previewArea: { flex: 1, marginVertical: Spacing.sm },
  links: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
});
