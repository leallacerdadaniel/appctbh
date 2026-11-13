import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';

import { MINAS_BH, MINAS_BH_CLEARANCE, MINAS_BOX, WORDMARK, minasPath } from '@/components/minas-shape';
import { AppText } from '@/components/ui';
import { Brand, Colors } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { useHomeState } from '@/lib/home';

/**
 * The opening of the app (owner, 2026-11-09: "a animação poderia ser o formato de MG: as letras saem de dentro dele na
 * horizontal, depois dá um zoom de novo no mapinha e abre a tela como um mapa").
 *
 * 1. It starts on exactly the native splash frame (app.json → expo-splash-screen: this color, the white map of Minas
 *    Gerais `SPLASH_MAP_WIDTH` wide, centered), so the hand-off is invisible.
 * 2. The brand gradient rises, the map settles into its place in the wordmark and "CHEZ" and "TOI BH" slide out of it.
 * 3. While the data loads: a red dot lands on Belo Horizonte, soft rings go out from it, a thin bar runs.
 * 4. When the app is ready: the camera dives into Belo Horizonte, the letters fly off, and the map grows into a window
 *    that opens on the screen underneath.
 *
 * The map is a vector (`minas-shape.ts`, traced from the wordmark), so it stays sharp at any zoom.
 */
export const SPLASH_BACKGROUND = '#B80A1C';
/** Width of the map on the native splash (app.json `imageWidth` for assets/brand/minas-white.png). */
export const SPLASH_MAP_WIDTH = 112;

const LOGO_WIDTH = 240;
const K = LOGO_WIDTH / WORDMARK.width; // points per artwork pixel in the assembled wordmark
const LOGO_HEIGHT = WORDMARK.height * K;
const CHEZ = require('@/assets/brand/logo-chez-white.png');
const TOI_BH = require('@/assets/brand/logo-toibh-white.png');

// The wordmark split around its map (points, in the assembled logo).
const CHEZ_CLIP = MINAS_BOX.x * K;
const MAP_RIGHT = (MINAS_BOX.x + MINAS_BOX.width) * K;
const TOI_CLIP = LOGO_WIDTH - MAP_RIGHT;
const TOI_OFFSET = WORDMARK.toiLeft * K - MAP_RIGHT;

const ENTRANCE_MS = 1400;
const EXIT_DELAY = 120;
const EXIT_ZOOM_MS = 950;
const RING = 260;
const RING_MS = 2700;
const DOT = 9;
const BAR_WIDTH = 128;
const BAR_PILL = 44;
const white = Colors.light.onBrand;

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Mounted once over the whole app (root layout). Plays while the session, then the student's data, load; plays again
 * after signing in. The screens underneath render as soon as they can, ready for the final reveal.
 */
export function AppOpening() {
  const { ready, isSignedIn } = useAuth();
  const { state } = useHomeState();
  const loading = !ready || (isSignedIn && state.status === 'loading');

  const [prevLoading, setPrevLoading] = useState(loading);
  const [run, setRun] = useState(0);
  const [goneRun, setGoneRun] = useState(-1);
  if (loading !== prevLoading) {
    setPrevLoading(loading);
    if (loading) setRun((r) => r + 1);
  }
  const onGone = useCallback(() => setGoneRun(run), [run]);

  if (goneRun === run) return null;
  return <Opening key={run} done={!loading} onGone={onGone} />;
}

function useLayout() {
  const { width, height } = useWindowDimensions();
  const left = (width - LOGO_WIDTH) / 2;
  const top = (height - LOGO_HEIGHT) / 2;
  // Splash frame: the map alone, centered.
  const splashScale = SPLASH_MAP_WIDTH / MINAS_BOX.width;
  const splashLeft = width / 2 - (MINAS_BOX.x + MINAS_BOX.width / 2) * splashScale;
  const splashTop = height / 2 - (MINAS_BOX.y + MINAS_BOX.height / 2) * splashScale;
  const bh = { x: left + MINAS_BH.x * K, y: top + MINAS_BH.y * K };
  // How far to zoom so that the map, around Belo Horizonte, covers the whole screen.
  const corner = Math.hypot(Math.max(bh.x, width - bh.x), Math.max(bh.y, height - bh.y));
  const maxZoom = (corner / (MINAS_BH_CLEARANCE * K)) * 1.15;
  return { width, height, left, top, splashScale, splashLeft, splashTop, bh, maxZoom };
}

function Opening({ done, onGone }: { done: boolean; onGone: () => void }) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const { width: W, height: H, left, top, splashScale, splashLeft, splashTop, bh, maxZoom } = useLayout();
  const logMax = Math.log(maxZoom);

  const rise = useSharedValue(reduceMotion ? 1 : 0); // brand gradient over the splash color
  const settle = useSharedValue(reduceMotion ? 1 : 0); // map: splash size → its place in the wordmark
  const letters = useSharedValue(reduceMotion ? 1 : 0); // CHEZ / TOI BH out of the map
  const extras = useSharedValue(0); // dot, rings, caption, bar (only while waiting)
  const zoom = useSharedValue(0); // the dive into Belo Horizonte
  const fade = useSharedValue(0); // reduced motion: plain fade out
  const [entered, setEntered] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) return;
    rise.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    settle.value = withDelay(150, withTiming(1, { duration: 750, easing: Easing.inOut(Easing.cubic) }));
    letters.value = withDelay(750, withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
    const timer = setTimeout(() => setEntered(true), ENTRANCE_MS);
    return () => clearTimeout(timer);
  }, [reduceMotion, rise, settle, letters]);

  // Still loading once the logo is whole: show that something is happening.
  const waiting = entered && !done;
  useEffect(() => {
    extras.value = withTiming(waiting ? 1 : 0, { duration: waiting ? 450 : 200, easing: Easing.out(Easing.cubic) });
  }, [waiting, extras]);

  useEffect(() => {
    if (!done || !entered) return;
    if (reduceMotion) {
      fade.value = withTiming(1, { duration: 250 });
    } else {
      zoom.value = withDelay(EXIT_DELAY, withTiming(1, { duration: EXIT_ZOOM_MS, easing: Easing.inOut(Easing.cubic) }));
    }
    const timer = setTimeout(onGone, reduceMotion ? 300 : EXIT_DELAY + EXIT_ZOOM_MS + 60);
    return () => clearTimeout(timer);
  }, [done, entered, reduceMotion, zoom, fade, onGone]);

  // The zoom grows exponentially, so the dive feels steady instead of crawling and then jumping.
  const bgProps = useAnimatedProps(() => {
    const rect = `M0 0H${W}V${H}H0Z`;
    if (zoom.value === 0) return { d: rect };
    return { d: rect + minasPath(K, left, top, Math.exp(zoom.value * logMax), bh.x, bh.y) };
  });
  const mapProps = useAnimatedProps(() => {
    const s = splashScale + (K - splashScale) * settle.value;
    const x = splashLeft + (left - splashLeft) * settle.value;
    const y = splashTop + (top - splashTop) * settle.value;
    const z = Math.exp(zoom.value * logMax);
    // White while it grows a little ("zoom no mapinha"), then it turns into the window on the app.
    const opacity = 1 - Math.min(1, Math.max(0, (zoom.value - 0.28) / 0.22));
    return { d: minasPath(s, x, y, z, bh.x, bh.y), fillOpacity: opacity };
  });

  const solidStyle = useAnimatedStyle(() => ({ opacity: 1 - rise.value }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, zoom.value * 5) }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: 1 - fade.value }));
  const extrasStyle = useAnimatedStyle(() => ({ opacity: extras.value }));
  const captionStyle = useAnimatedStyle(() => ({
    opacity: extras.value,
    transform: [{ translateY: (1 - extras.value) * 8 }],
  }));
  const dotStyle = useAnimatedStyle(() => ({
    opacity: extras.value > 0 ? 1 : 0,
    transform: [{ translateY: (1 - extras.value) * -14 }, { scale: 0.4 + extras.value * 0.6 }],
  }));
  // The letters ride the same camera: scaled around Belo Horizonte, gone after the first part of the dive.
  const wordStyle = useAnimatedStyle(() => {
    const z = Math.exp(zoom.value * logMax);
    const cx = left + LOGO_WIDTH / 2;
    const cy = top + LOGO_HEIGHT / 2;
    return {
      opacity: 1 - Math.min(1, zoom.value * 4),
      transform: [{ translateX: (bh.x - cx) * (1 - z) }, { translateY: (bh.y - cy) * (1 - z) }, { scale: z }],
    };
  });
  const chezStyle = useAnimatedStyle(() => ({
    opacity: letters.value,
    transform: [{ translateX: (1 - letters.value) * CHEZ_CLIP }],
  }));
  const toiStyle = useAnimatedStyle(() => ({
    opacity: letters.value,
    transform: [{ translateX: -(1 - letters.value) * TOI_CLIP }],
  }));

  return (
    <Animated.View
      // Takes the touches for as long as it covers the screen (it unmounts in onGone): letting them through
      // as soon as the data arrived meant tapping blind on whatever was underneath (review, 2026-11-10).
      pointerEvents="auto"
      style={[StyleSheet.absoluteFill, overlayStyle]}
      accessibilityRole="progressbar"
      accessibilityLabel={t.gate.loading}>
      <StatusBar style="light" />
      {/* 1. The brand gradient, with a map-shaped hole that opens at the end. */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <SvgLinearGradient id="openingBg" x1={0.1 * W} y1={0} x2={0.9 * W} y2={H} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={Brand.barGradient[0]} />
            <Stop offset="0.5" stopColor={Brand.barGradient[1]} />
            <Stop offset="1" stopColor={Brand.barGradient[2]} />
          </SvgLinearGradient>
        </Defs>
        <AnimatedPath animatedProps={bgProps} fill="url(#openingBg)" fillRule="evenodd" />
      </Svg>

      {/* 2. Drifting lights. */}
      {!reduceMotion && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glowStyle]}>
          <Glows width={W} height={H} />
        </Animated.View>
      )}

      {/* 3. The splash color, fading away as the gradient rises. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: SPLASH_BACKGROUND }, solidStyle]}
      />

      {/* 4. Rings from Belo Horizonte while waiting. */}
      {!reduceMotion && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, extrasStyle]}>
          {[0, 1, 2].map((i) => (
            <Ripple key={i} index={i} x={bh.x} y={bh.y} active={waiting} />
          ))}
        </Animated.View>
      )}

      {/* 5. The map of Minas Gerais. */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
        <AnimatedPath animatedProps={mapProps} fill={white} />
      </Svg>

      {/* 6. CHEZ and TOI BH, each sliding out of one side of the map. */}
      <Animated.View pointerEvents="none" style={[styles.word, { left, top }, wordStyle]}>
        <View style={[styles.clip, { left: 0, width: CHEZ_CLIP }]}>
          <Animated.View style={chezStyle}>
            <Image source={CHEZ} style={styles.chez} contentFit="contain" accessible={false} />
          </Animated.View>
        </View>
        <View style={[styles.clip, { left: MAP_RIGHT, width: TOI_CLIP }]}>
          <Animated.View style={[{ marginLeft: TOI_OFFSET }, toiStyle]}>
            <Image source={TOI_BH} style={styles.toi} contentFit="contain" accessible={false} />
          </Animated.View>
        </View>
      </Animated.View>

      {/* 7. The red dot on Belo Horizonte, the caption and the bar. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.dot, { left: bh.x - DOT / 2, top: bh.y - DOT / 2 }, dotStyle]}
      />
      <Animated.View pointerEvents="none" style={[styles.below, { top: top + LOGO_HEIGHT + 64 }, captionStyle]}>
        <AppText variant="callout" color={Colors.light.onBrandMuted} style={styles.caption}>
          {t.gate.loading}
        </AppText>
        <ProgressBar active={waiting && !reduceMotion} />
      </Animated.View>
    </Animated.View>
  );
}

/** The brand gradient over the whole screen: bright red at the top left, deep wine at the bottom right. */
export function BrandGradient() {
  return (
    <LinearGradient
      colors={Brand.barGradient}
      locations={[0, 0.5, 1]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

/** Two soft lights drifting in the background: white at the top left, warm pink at the bottom right. */
function Glows({ width, height }: { width: number; height: number }) {
  return (
    <>
      <Glow id="glowA" color="#FFFFFF" strength={0.16} size={width * 1.1} x={-width * 0.35} y={-height * 0.12} dx={40} dy={50} ms={7000} />
      <Glow id="glowB" color="#FF7A86" strength={0.28} size={width * 1.2} x={width * 0.3} y={height * 0.62} dx={-50} dy={-40} ms={8600} />
    </>
  );
}

/** A soft round light that drifts slowly back and forth. */
function Glow({
  id,
  color,
  strength,
  size,
  x,
  y,
  dx,
  dy,
  ms,
}: {
  id: string;
  color: string;
  strength: number;
  size: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  ms: number;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [p, ms]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: p.value * dx }, { translateY: p.value * dy }, { scale: 1 + p.value * 0.08 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, top: y, width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={strength} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/** A thin white ring that grows out of Belo Horizonte and fades; three of them, a third of a beat apart. */
function Ripple({ index, x, y, active }: { index: number; x: number; y: number; active: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (!active) return;
    p.value = withDelay(
      250 + (index * RING_MS) / 3,
      withRepeat(withTiming(1, { duration: RING_MS, easing: Easing.out(Easing.quad) }), -1, false),
    );
  }, [p, index, active]);
  return <RippleRing progress={p} x={x} y={y} />;
}

function RippleRing({ progress, x, y }: { progress: SharedValue<number>; x: number; y: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: progress.value === 0 ? 0 : 0.5 * (1 - progress.value),
    transform: [{ scale: 0.08 + progress.value * 0.92 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.ring, { left: x - RING / 2, top: y - RING / 2 }, style]} />;
}

/** Indeterminate bar: a short white pill running along a faint track. */
function ProgressBar({ active }: { active: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (!active) return;
    p.value = withRepeat(
      withSequence(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) }), withTiming(0, { duration: 0 })),
      -1,
      false,
    );
  }, [p, active]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: -BAR_PILL + p.value * (BAR_WIDTH + BAR_PILL) }] }));
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.pill, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  word: { position: 'absolute', width: LOGO_WIDTH, height: LOGO_HEIGHT },
  clip: { position: 'absolute', top: 0, height: LOGO_HEIGHT, overflow: 'hidden' },
  chez: { width: WORDMARK.chezRight * K, height: LOGO_HEIGHT },
  toi: { width: (WORDMARK.width - WORDMARK.toiLeft) * K, height: LOGO_HEIGHT },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: Brand.red,
    borderWidth: 2,
    borderColor: white,
    boxShadow: '0 1px 4px rgba(80, 0, 8, 0.45)',
  },
  ring: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 1.5,
    borderColor: white,
  },
  below: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 14, paddingHorizontal: 32 },
  caption: { textAlign: 'center' },
  track: {
    width: BAR_WIDTH,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: Colors.light.onBrandTrack,
  },
  pill: { width: BAR_PILL, height: 3, borderRadius: 2, backgroundColor: white },
});
