import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type TextProps } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ListRow } from '@/components/list';
import { PlacePhoto } from '@/components/place-photo';
import { AppText, PressableScale } from '@/components/ui';
import { Brand, Colors, Fonts, Radius, Shadow, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, type Lang } from '@/i18n';
import { useHome } from '@/lib/home';
import { useJournalTracker } from '@/lib/journal';
import { latestRecap, recapId, shareStats, type RecapData, type RecapPlace, type SlideKind } from '@/lib/recap';
import { useVisits, type VisitKind } from '@/lib/visited';

/**
 * Monthly and semester recaps ("Ton mois d'octobre", Spotify Wrapped-like): story slides, the Instagram
 * share card, the entry card and the "J'y suis allé" toggle of the place pages.
 * Screens: src/app/recap/ (hub, [id] player, timeline, location); data: src/lib/recap.ts, journal.ts.
 *
 * Its own bold palette (owner, 2026-11-08: brand colors, Spotify-like): brand red, deep red and three
 * accents. Used only by the recaps, like the birthday card is the one festive exception.
 */
export const RecapColors = {
  red: Brand.red,
  /** End of the rules intro gradient. */
  deepRed: '#8E0716',
  /** BH sun / ipê amarelo. */
  sun: '#FFC531',
  ink: Colors.light.text,
  blue: Colors.light.info,
  white: '#FFFFFF',
} as const;

/** fg/muted on bg pass 4.5:1; accent (the big numbers) passes 3:1 as large text. `dark` = dark status bar. */
export type SlideTheme = { bg: string; fg: string; muted: string; accent: string; tone: string; dark: boolean };

const C = RecapColors;
const WHITE_MUTED = 'rgba(255,255,255,0.86)';

export const SLIDE_THEMES: SlideTheme[] = [
  { bg: C.red, fg: C.white, muted: WHITE_MUTED, accent: C.white, tone: '#D50A1D', dark: false },
  { bg: C.sun, fg: C.ink, muted: 'rgba(22,22,26,0.8)', accent: C.deepRed, tone: '#FFD45F', dark: true },
  { bg: C.ink, fg: C.white, muted: 'rgba(255,255,255,0.8)', accent: C.sun, tone: '#24242B', dark: false },
  { bg: C.blue, fg: C.white, muted: WHITE_MUTED, accent: C.sun, tone: '#3D61D3', dark: false },
  { bg: C.deepRed, fg: C.white, muted: WHITE_MUTED, accent: C.sun, tone: '#9E0A1B', dark: false },
];
/** The share slide is always ink, so the red card stands out. */
export const SHARE_THEME = SLIDE_THEMES[2];

/** One theme per slide, in turn; the slide before the share card never has the same ink background. */
export function slideThemes(slides: SlideKind[]): SlideTheme[] {
  const themes = slides.map((kind, i) => (kind === 'share' ? SHARE_THEME : SLIDE_THEMES[i % SLIDE_THEMES.length]));
  const before = themes.length - 2;
  if (before > 0 && themes[before] === SHARE_THEME) {
    themes[before] = themes[before - 1] === SLIDE_THEMES[4] ? SLIDE_THEMES[0] : SLIDE_THEMES[4];
  }
  return themes;
}

/* ---------- Text ---------- */

type Size = 'huge' | 'big' | 'title' | 'line' | 'kicker' | 'small';

const SIZES = {
  huge: { fontFamily: Fonts.display, fontSize: 104, lineHeight: 110, letterSpacing: -3 },
  big: { fontFamily: Fonts.display, fontSize: 38, lineHeight: 44, letterSpacing: -1 },
  title: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  line: { fontFamily: Fonts.bodyMedium, fontSize: 17, lineHeight: 24 },
  kicker: { fontFamily: Fonts.bodySemi, fontSize: 15, lineHeight: 20 },
  small: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 18 },
} as const;

/** Slides have no scroll: text grows with Dynamic Type, but only a little. */
function T({ size, color, style, ...props }: TextProps & { size: Size; color: string }) {
  return (
    <Text maxFontSizeMultiplier={size === 'huge' ? 1.1 : 1.3} {...props} style={[SIZES[size], { color }, style]} />
  );
}

/* ---------- Helpers ---------- */

/** "4 août", "1er août" · "August 4". */
export function dayMonth(iso: string, lang: Lang) {
  const [y, m, d] = iso.split('-').map(Number);
  const text = new Date(y, m - 1, d).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'long',
  });
  return lang === 'fr' && d === 1 ? text.replace(/^1 /, '1er ') : text;
}

/** "2026-10" → "octobre" (fr) · "October" (en), from the app's month names. */
export function useMonthName() {
  const { t } = useI18n();
  return (month: string) => t.months[Number(month.slice(5, 7)) - 1] ?? month;
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const KIND_ICONS: Record<VisitKind, IconName> = {
  restaurant: 'restaurant',
  bar: 'bar',
  club: 'party',
  attraction: 'culture',
};

/* ---------- Frame ---------- */

/** Background color with two tone-on-tone circles (decoration only, never under text contrast). */
export function Backdrop({ theme }: { theme: SlideTheme }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg, overflow: 'hidden' }]}>
      <View style={[styles.circleTop, { backgroundColor: theme.tone }]} />
      <View style={[styles.circleBottom, { backgroundColor: theme.tone }]} />
    </View>
  );
}

/** Instagram-like bars: past slides full, the current one fills with `current` (the animated bar). */
export function StoryBars({
  count,
  index,
  theme,
  current,
  label,
}: {
  count: number;
  index: number;
  theme: SlideTheme;
  current: ReactNode;
  label: string;
}) {
  const track = theme.dark ? 'rgba(22,22,26,0.22)' : 'rgba(255,255,255,0.32)';
  return (
    <View style={styles.bars} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.bar, { backgroundColor: track }]}>
          {i < index && <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.fg }]} />}
          {i === index && current}
        </View>
      ))}
    </View>
  );
}

export function RecapLogo({ theme }: { theme: SlideTheme }) {
  return (
    <Image
      source={
        theme.dark ? require('@/assets/brand/logo-wordmark.png') : require('@/assets/brand/logo-wordmark-white.png')
      }
      style={styles.logo}
      contentFit="contain"
      accessibilityLabel="Chez Toi BH"
    />
  );
}

export function CloseButton({ theme, onPress }: { theme: SlideTheme; onPress: () => void }) {
  const { t } = useI18n();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t.recap.close}
      onPress={onPress}
      style={[styles.close, { backgroundColor: theme.dark ? 'rgba(22,22,26,0.1)' : 'rgba(255,255,255,0.16)' }]}>
      <Icon name="close" size={22} color={theme.fg} />
    </PressableScale>
  );
}

/** Big pill button in the slide's text color (white on the ink share slide). */
export function StoryButton({
  label,
  icon,
  theme,
  loading,
  onPress,
}: {
  label: string;
  icon?: IconName;
  theme: SlideTheme;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: !!loading, disabled: !!loading }}
      disabled={loading}
      onPress={onPress}
      style={[styles.storyButton, { backgroundColor: theme.fg }]}>
      {loading ? (
        <ActivityIndicator color={theme.bg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={18} color={theme.bg} />}
          <T size="line" color={theme.bg} style={{ fontFamily: Fonts.bodySemi }}>
            {label}
          </T>
        </>
      )}
    </PressableScale>
  );
}

export function StoryLink({ label, theme, onPress }: { label: string; theme: SlideTheme; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.storyLink}>
      <T size="kicker" color={theme.muted}>
        {label}
      </T>
    </PressableScale>
  );
}

/* ---------- Slides ---------- */

type SlideProps = { data: RecapData; theme: SlideTheme };

function Stat({ value, label, theme }: { value: number; label: string; theme: SlideTheme }) {
  return (
    <View>
      <T size="huge" color={theme.accent}>
        {value}
      </T>
      <T size="title" color={theme.fg}>
        {label}
      </T>
    </View>
  );
}

function Lines({ lines, theme }: { lines: (string | false | null | undefined)[]; theme: SlideTheme }) {
  const shown = lines.filter((l): l is string => !!l);
  if (!shown.length) return null;
  return (
    <View style={{ gap: Spacing.sm }}>
      {shown.map((line) => (
        <T key={line} size="line" color={theme.muted}>
          {line}
        </T>
      ))}
    </View>
  );
}

function Kicker({ text, theme }: { text: string; theme: SlideTheme }) {
  return (
    <T size="kicker" color={theme.muted}>
      {text}
    </T>
  );
}

/** Photo of a guide place: the app's own, else Google's with its credit on the photo. */
function PlaceShot({ place, aspectRatio = 16 / 10, radius = Radius.lg }: { place: RecapPlace; aspectRatio?: number; radius?: number }) {
  if (!place.placeId) return null;
  return (
    <PlacePhoto
      placeId={place.placeId}
      source={place.photo}
      photoIndex={place.photoIndex}
      width={800}
      aspectRatio={aspectRatio}
      radius={radius}
      credit="overlay"
    />
  );
}

export function IntroSlide({ data, theme }: SlideProps) {
  const { t } = useI18n();
  const monthName = useMonthName();
  const r = t.recap;
  const s = data.scope;
  const title = !data.firstName
    ? s.kind === 'semester'
      ? r.share.card.semester
      : r.share.card.month(monthName(s.month))
    : s.kind === 'semester'
      ? r.intro.semester(data.firstName)
      : data.status === 'progress'
        ? r.intro.progress(data.firstName, monthName(s.month))
        : r.intro.month(data.firstName, monthName(s.month));
  return (
    <View style={styles.body}>
      <T size="big" color={theme.fg} style={{ fontSize: 44, lineHeight: 50 }}>
        {title}
      </T>
      <View style={styles.hint}>
        <T size="kicker" color={theme.muted}>
          {r.intro.hint}
        </T>
        <Icon name="chevronRight" size={15} color={theme.muted} />
      </View>
    </View>
  );
}

export function DaysSlide({ data, theme }: SlideProps) {
  const { t } = useI18n();
  const r = t.recap.days;
  const { total, bh, away, cities } = data.days;
  return (
    <View style={styles.body}>
      <Kicker text={r.of(total)} theme={theme} />
      <Stat value={bh} label={r.label(bh)} theme={theme} />
      {away > 0 && (
        <View style={[styles.split, { backgroundColor: theme.dark ? 'rgba(22,22,26,0.14)' : 'rgba(255,255,255,0.24)' }]}>
          <View style={{ flex: bh, backgroundColor: theme.fg }} />
          <View style={{ flex: away, backgroundColor: theme.accent === theme.fg ? 'transparent' : theme.accent }} />
        </View>
      )}
      <Lines lines={[away > 0 && r.away(away), cities.length > 0 && r.cities(cities.join(', '))]} theme={theme} />
    </View>
  );
}

export function PlacesSlide({ data, theme }: SlideProps) {
  const { t, lang } = useI18n();
  const r = t.recap.places;
  const places = data.places!;
  return (
    <View style={styles.body}>
      {places.first.placeId && (
        <View style={{ gap: Spacing.sm }}>
          <PlaceShot place={places.first} />
        </View>
      )}
      <Kicker text={r.kicker} theme={theme} />
      <Stat value={places.count} label={r.label(places.count)} theme={theme} />
      <Lines lines={[r.first(places.first.name, dayMonth(places.first.firstDay, lang))]} theme={theme} />
    </View>
  );
}

export function TopSlide({ data, theme }: SlideProps) {
  const { t } = useI18n();
  const r = t.recap.top;
  const top = data.places!.top!;
  return (
    <View style={styles.body}>
      <PlaceShot place={top} aspectRatio={4 / 3} />
      <Kicker text={data.scope.kind === 'semester' ? r.semester : r.month} theme={theme} />
      <T size="big" color={theme.fg}>
        {top.name}
      </T>
      <T size="title" color={theme.accent}>
        {r.visits(top.visits)}
      </T>
      <Lines lines={[[t.recap.kinds[top.kind], top.neighborhood].filter(Boolean).join(' · ')]} theme={theme} />
    </View>
  );
}

export function NeighborhoodSlide({ data, theme }: SlideProps) {
  const { t } = useI18n();
  const r = t.recap.neighborhood;
  const hood = data.neighborhood!;
  return (
    <View style={styles.body}>
      <Kicker text={r.kicker} theme={theme} />
      <T size="big" color={theme.accent} style={{ fontSize: 56, lineHeight: 62, letterSpacing: -1.5 }}>
        {hood.name}
      </T>
      <Lines lines={[r.count(hood.count)]} theme={theme} />
    </View>
  );
}

export function MixSlide({ data, theme }: SlideProps) {
  const { t } = useI18n();
  const r = t.recap.mix;
  const mix = data.mix!;
  const [a, b] = mix;
  const max = a.count;
  const track = theme.dark ? 'rgba(22,22,26,0.14)' : 'rgba(255,255,255,0.2)';
  return (
    <View style={styles.body}>
      <Kicker text={r.kicker} theme={theme} />
      <T size="big" color={theme.fg}>
        {a.count > b.count ? r.more(r.kinds[a.kind], r.kinds[b.kind]) : r.even}
      </T>
      <View style={{ gap: Spacing.md, marginTop: Spacing.sm }}>
        {mix.map((m) => (
          <View key={m.kind} style={{ gap: 6 }}>
            <View style={styles.mixLabel}>
              <Icon name={KIND_ICONS[m.kind]} size={16} color={theme.fg} />
              <T size="kicker" color={theme.fg} style={{ flex: 1 }}>
                {r.rows[m.kind]}
              </T>
              <T size="kicker" color={theme.fg}>
                {m.count}
              </T>
            </View>
            <View style={[styles.mixTrack, { backgroundColor: track }]}>
              <View style={[styles.mixFill, { width: `${(m.count / max) * 100}%`, backgroundColor: theme.accent }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function PortugueseSlide({ data, theme }: SlideProps) {
  const { t } = useI18n();
  const r = t.recap.portuguese;
  const pt = data.portuguese!;
  return (
    <View style={styles.body}>
      <Kicker text={r.kicker} theme={theme} />
      {pt.learned > 0 ? (
        <Stat value={pt.learned} label={r.label(pt.learned)} theme={theme} />
      ) : (
        <Stat value={pt.lessons} label={r.lessonsLabel(pt.lessons)} theme={theme} />
      )}
      <Lines
        lines={[
          pt.best >= 2 && r.best(pt.best),
          pt.learned > 0 && pt.lessons > 0 && r.lessons(pt.lessons),
          pt.learned >= 5 && r.cheer,
        ]}
        theme={theme}
      />
    </View>
  );
}

/** Up to 6 photos as a collage, slightly turned like prints on a table. */
function Collage({ uris, width, frame }: { uris: string[]; width: number; frame: string }) {
  const columns = uris.length <= 1 ? 1 : uris.length <= 4 ? 2 : 3;
  const gap = 10;
  const size = (width - gap * (columns - 1)) / columns;
  return (
    <View style={[styles.collage, { gap, width }]}>
      {uris.map((uri, i) => (
        <View
          key={uri}
          style={[
            styles.print,
            {
              width: size,
              height: columns === 1 ? size * 0.75 : size * 1.25,
              backgroundColor: frame,
              transform: [{ rotate: `${i % 2 === 0 ? -2 : 2}deg` }],
            },
          ]}>
          <Image source={{ uri }} style={styles.printImage} contentFit="cover" accessible={false} />
        </View>
      ))}
    </View>
  );
}

export function PhotosSlide({ data, theme }: SlideProps) {
  const { t } = useI18n();
  const monthName = useMonthName();
  const [width, setWidth] = useState(0);
  const s = data.scope;
  return (
    <View style={styles.body} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <T size="title" color={theme.fg}>
        {s.kind === 'semester' ? t.recap.photos.semester : t.recap.photos.month(monthName(s.month))}
      </T>
      {width > 0 && <Collage uris={data.photos} width={width} frame={C.white} />}
    </View>
  );
}

export function NextSlide({ data, theme }: SlideProps) {
  const { t } = useI18n();
  const r = t.recap.upcoming;
  return (
    <View style={styles.body}>
      <Kicker text={r.kicker} theme={theme} />
      <T size="big" color={theme.fg}>
        {r.title}
      </T>
      <Lines lines={[r.hint]} theme={theme} />
      <View style={{ gap: Spacing.md, marginTop: Spacing.sm }}>
        {data.next.map((p) => (
          <View key={p.id} style={styles.nextRow}>
            <View style={styles.nextThumb}>
              {p.placeId ? (
                <PlaceShot place={p} aspectRatio={1} radius={14} />
              ) : (
                <View style={[styles.nextIcon, { backgroundColor: theme.tone }]}>
                  <Icon name={KIND_ICONS[p.kind]} size={22} color={theme.fg} />
                </View>
              )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T size="kicker" color={theme.fg}>
                {p.name}
              </T>
              <T size="small" color={theme.muted}>
                {[t.recap.kinds[p.kind], p.neighborhood].filter(Boolean).join(' · ')}
              </T>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ClosingSlide({ data, theme }: SlideProps) {
  const { t } = useI18n();
  const r = t.recap.closing;
  return (
    <View style={styles.body}>
      <T size="big" color={theme.fg} style={{ fontSize: 44, lineHeight: 50 }}>
        {data.last ? r.end : r.month}
      </T>
      <Lines lines={[data.last ? r.endBody(data.firstName) : r.monthBody]} theme={theme} />
    </View>
  );
}

/* ---------- Share card ---------- */

export type ViewRef = ComponentRef<typeof View>;

/** Drawn at this size and captured at 1080 × 1920 (Instagram story). */
export const CARD_WIDTH = 360;
export const CARD_HEIGHT = 640;

/**
 * The image the student posts: brand red, the logo, the month (or semester), their photos and up to four
 * numbers. Fixed size and no font scaling, so the image is the same on every phone.
 */
export function ShareCard({ data, ref }: { data: RecapData; ref?: Ref<ViewRef> }) {
  const { t } = useI18n();
  const monthName = useMonthName();
  const c = t.recap.share.card;
  const s = data.scope;
  const stats = shareStats(data);
  const photos = data.photos.slice(0, 3);
  const title =
    s.kind === 'semester'
      ? c.semester
      : data.status === 'progress'
        ? c.progress(monthName(s.month))
        : c.month(monthName(s.month));
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <LinearGradient
        colors={[C.red, C.deepRed]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.cardCircle, { backgroundColor: 'rgba(255,255,255,0.07)' }]} />
      <Image source={require('@/assets/brand/logo-wordmark-white.png')} style={styles.cardLogo} contentFit="contain" />
      <View style={styles.cardMain}>
        <Text allowFontScaling={false} style={[SIZES.big, { color: C.white }]}>
          {title}
        </Text>
        {photos.length > 0 && (
          <View style={styles.cardPhotos}>
            {photos.map((uri, i) => (
              <View
                key={uri}
                style={[styles.cardPrint, { transform: [{ rotate: `${[-5, 3, -2][i]}deg` }], zIndex: 3 - i }]}>
                <Image source={{ uri }} style={styles.printImage} contentFit="cover" />
              </View>
            ))}
          </View>
        )}
        {stats.length > 0 && (
          <View style={styles.cardGrid}>
            {stats.map((st) => (
              <View key={st.kind} style={styles.cardTile}>
                <Text allowFontScaling={false} style={styles.cardNumber}>
                  {st.value}
                </Text>
                <Text allowFontScaling={false} style={[SIZES.small, styles.cardLabel]}>
                  {c.stats[st.kind](st.value)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={styles.cardFooter}>
        <View style={[styles.cardDot, { backgroundColor: C.sun }]} />
        <Text allowFontScaling={false} style={[SIZES.kicker, { color: C.white }]}>
          {c.footer}
        </Text>
      </View>
    </View>
  );
}

/** The card scaled down to fit the space it is given; the full-size card underneath is what gets captured. */
export function ShareCardPreview({ data, cardRef }: { data: RecapData; cardRef: Ref<ViewRef> }) {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const scale = box ? Math.min(box.width / CARD_WIDTH, box.height / CARD_HEIGHT) : 0;
  return (
    <View
      style={styles.previewBox}
      onLayout={(e) => setBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      {scale > 0 && (
        <View style={[styles.preview, Shadow.raised, { width: CARD_WIDTH * scale, height: CARD_HEIGHT * scale }]}>
          <View style={{ transform: [{ scale }] }}>
            <ShareCard data={data} ref={cardRef} />
          </View>
        </View>
      )}
    </View>
  );
}

/* ---------- Entry ---------- */

/**
 * Card that opens the latest recap: "Ton mois d'octobre est prêt" from the 1st of November, "Ton mois de
 * novembre, jusqu'ici" from the 7th when no month is ready yet, the semester in the last three weeks.
 * Hidden until there is one. Also keeps the recap journal going (useJournalTracker).
 * Brand red on purpose (owner, 2026-11-09: "o recap com o fundo vermelho dava um destaque bem top").
 */
export function RecapEntry() {
  useJournalTracker();
  const home = useHome();
  const { t } = useI18n();
  const monthName = useMonthName();
  const [today] = useState(() => new Date());
  const latest = latestRecap(home, today);
  if (!latest) return null;
  const s = latest.scope;
  const title =
    s.kind === 'semester'
      ? t.recap.entry.semester
      : latest.range.status === 'ready'
        ? t.recap.entry.ready(monthName(s.month))
        : t.recap.entry.progress(monthName(s.month));
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${t.recap.entry.hint}`}
      onPress={() => router.push(`/recap/${recapId(s)}`)}
      style={[styles.entry, Shadow.card]}>
      <LinearGradient
        colors={[C.red, C.deepRed]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.entryCircle, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
      <View style={styles.stack} accessible={false}>
        <View style={[styles.mini, { backgroundColor: C.blue, transform: [{ rotate: '-10deg' }], left: 0 }]} />
        <View style={[styles.mini, { backgroundColor: C.ink, transform: [{ rotate: '-2deg' }], left: 9 }]} />
        <View style={[styles.mini, { backgroundColor: C.sun, transform: [{ rotate: '7deg' }], left: 18 }]} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="title" color={C.white}>
          {title}
        </AppText>
        <AppText variant="callout" color={WHITE_MUTED}>
          {t.recap.entry.hint}
        </AppText>
      </View>
      <View style={[styles.entryPlay, { backgroundColor: C.white }]}>
        <Icon name="play" size={18} color={C.red} />
      </View>
    </PressableScale>
  );
}

/**
 * A row for a list (Séjour, Profil): "Mes récaps" → the hub with every month, the journals and
 * "Ta carte de BH". Always there, so the student can turn the map on before the first recap is ready.
 * Render it inside a `Card` + `ListGroup` like any `ListRow`.
 */
export function RecapHubRow() {
  const { t } = useI18n();
  // Its own icon: the sparkles belong to the app tour, in the same list (UX review 2026-11-09).
  return <ListRow icon="photo" title={t.recap.hub.title} subtitle={t.recap.hub.rowHint} onPress={() => router.push('/recap')} />;
}

/* ---------- "J'y suis allé" ---------- */

/**
 * Small toggle on the place pages: the place counts in the monthly recaps (kept on the phone).
 * Keeps its height while the check-ins load, so the page never jumps.
 */
export function VisitedToggle({ id, name, kind }: { id: string; name: string; kind: VisitKind }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { loaded, visitOf, toggle } = useVisits();
  const visit = visitOf(id);
  if (!loaded) return <View style={styles.visitSpace} />;
  const label = visit ? t.recap.visit.done(dayMonth(visit.date, lang)) : t.recap.visit.label;
  return (
    <PressableScale
      accessibilityRole="togglebutton"
      accessibilityState={{ checked: !!visit }}
      accessibilityLabel={t.recap.visit.label}
      accessibilityHint={t.recap.visit.hint}
      hitSlop={VISIT_SLOP}
      onPress={() => toggle({ id, name, kind })}
      style={[
        styles.visit,
        visit
          ? { backgroundColor: theme.successSoft, borderColor: theme.successSoft }
          : { backgroundColor: theme.surface, borderColor: theme.line },
      ]}>
      <Icon name="visited" active={!!visit} size={16} color={visit ? theme.success : theme.textSecondary} />
      <AppText variant="callout" color={visit ? theme.success : theme.text} style={{ fontFamily: Fonts.bodyMedium }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const VISIT_HEIGHT = 36;
const VISIT_SLOP = { top: (TapTarget - VISIT_HEIGHT) / 2, bottom: (TapTarget - VISIT_HEIGHT) / 2 };

const styles = StyleSheet.create({
  circleTop: { position: 'absolute', width: 360, height: 360, borderRadius: 180, top: -150, right: -170 },
  circleBottom: { position: 'absolute', width: 260, height: 260, borderRadius: 130, bottom: -110, left: -130 },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  logo: { width: 124, height: 22 },
  close: {
    width: TapTarget,
    height: TapTarget,
    borderRadius: TapTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyButton: {
    minHeight: 56,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  storyLink: { alignSelf: 'center', minHeight: TapTarget, justifyContent: 'center', paddingHorizontal: Spacing.md },
  body: { gap: Spacing.md },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.lg },
  split: { height: 10, borderRadius: 5, overflow: 'hidden', flexDirection: 'row' },
  mixLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mixTrack: { height: 12, borderRadius: 6, overflow: 'hidden' },
  mixFill: { height: '100%', borderRadius: 6 },
  collage: { flexDirection: 'row', flexWrap: 'wrap' },
  print: { padding: 5, borderRadius: 6, ...Shadow.raised },
  printImage: { flex: 1, borderRadius: 3 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nextThumb: { width: 64 },
  nextIcon: { width: 64, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  card: { width: CARD_WIDTH, height: CARD_HEIGHT, padding: 28, overflow: 'hidden', backgroundColor: C.red },
  cardCircle: { position: 'absolute', width: 420, height: 420, borderRadius: 210, top: -170, right: -200 },
  cardLogo: { width: 158, height: 28 },
  cardMain: { flex: 1, justifyContent: 'center', gap: 22 },
  cardPhotos: { flexDirection: 'row', justifyContent: 'center', height: 132 },
  cardPrint: {
    width: 104,
    height: 128,
    marginHorizontal: -6,
    padding: 5,
    borderRadius: 6,
    backgroundColor: C.white,
    ...Shadow.raised,
  },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cardTile: {
    flexGrow: 1,
    flexBasis: '40%',
    backgroundColor: C.white,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 2,
  },
  cardNumber: { fontFamily: Fonts.display, fontSize: 36, lineHeight: 42, letterSpacing: -1, color: C.red },
  cardLabel: { color: C.ink, fontFamily: Fonts.bodyMedium },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardDot: { width: 10, height: 10, borderRadius: 5 },
  previewBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  preview: { borderRadius: Radius.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  entry: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: Spacing.md,
    minHeight: 96,
  },
  entryCircle: { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: -70, right: -50 },
  stack: { width: 50, height: 52 },
  mini: {
    position: 'absolute',
    top: 6,
    width: 28,
    height: 42,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  entryPlay: {
    width: TapTarget,
    height: TapTarget,
    borderRadius: TapTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visit: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    height: VISIT_HEIGHT,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  visitSpace: { height: VISIT_HEIGHT },
});
