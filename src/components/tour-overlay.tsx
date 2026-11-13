import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { CharlotteFace } from '@/components/charlotte';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, MaxContentWidth, MaxFontScale, Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useTour, type TourRect } from '@/lib/tour';

const PAD = 8;
const RADIUS = 18;
/** Between the ring and the bubble. */
const GAP = PAD + 12;
/** The bubble's text grows with Dynamic Type up to the app's cap, so it never hides the whole target. */
const MAX_SCALE = MaxFontScale;

/** Full-screen rectangle with a rounded hole where the target is (even-odd fill). */
function holePath(W: number, H: number, r: TourRect) {
  const x = r.x - PAD;
  const y = r.y - PAD;
  const w = r.w + PAD * 2;
  const h = r.h + PAD * 2;
  const k = Math.min(RADIUS, w / 2, h / 2);
  return (
    `M0 0H${W}V${H}H0Z ` +
    `M${x + k} ${y}H${x + w - k}A${k} ${k} 0 0 1 ${x + w} ${y + k}V${y + h - k}` +
    `A${k} ${k} 0 0 1 ${x + w - k} ${y + h}H${x + k}A${k} ${k} 0 0 1 ${x} ${y + h - k}V${y + k}` +
    `A${k} ${k} 0 0 1 ${x + k} ${y}Z`
  );
}

/**
 * The tour on top of the tabs: everything dimmed but the target, and Charlotte explaining it in a white
 * bubble below or above it, always kept inside the screen. Tapping anywhere outside the bubble goes to the
 * next step; "Passer" ends the tour from any step but the last one ("Terminer").
 */
export function TourOverlay() {
  const theme = useTheme();
  const { t } = useI18n();
  const tour = useTour();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [bubbleH, setBubbleH] = useState(0);

  if (!tour || tour.index == null) return null;
  const step = tour.steps[tour.index];
  if (!step) return null;
  const rect = step.rect;
  const last = tour.index === tour.steps.length - 1;
  const first = tour.index === 0;

  // Below the target when it fits, else above, else wherever there is more room; then clamped to the screen.
  const minTop = insets.top + Spacing.sm;
  const maxTop = Math.max(minTop, H - bubbleH - Math.max(insets.bottom, Spacing.sm) - Spacing.sm);
  let top = H * 0.3;
  if (rect) {
    const below = rect.y + rect.h + GAP;
    const above = rect.y - GAP - bubbleH;
    const roomBelow = H - insets.bottom - below;
    const roomAbove = rect.y - GAP - insets.top;
    top = roomBelow >= bubbleH ? below : roomAbove >= bubbleH ? above : roomBelow >= roomAbove ? below : above;
  }
  top = Math.min(Math.max(top, minTop), maxTop);

  const action = last ? t.tour.done : first ? t.tour.start : t.tour.next;

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path
          d={rect ? holePath(W, H, rect) : `M0 0H${W}V${H}H0Z`}
          fill="rgba(10,10,14,0.66)"
          fillRule="evenodd"
        />
      </Svg>
      {/* The whole backdrop is a "next" button: the tour can never leave the app without a way out. */}
      <Pressable
        accessible={false}
        onPress={last ? tour.stop : tour.next}
        style={StyleSheet.absoluteFill}
      />
      {rect && (
        <View
          pointerEvents="none"
          style={[
            styles.ring,
            { left: rect.x - PAD, top: rect.y - PAD, width: rect.w + PAD * 2, height: rect.h + PAD * 2 },
          ]}
        />
      )}

      <Animated.View
        key={step.id}
        entering={FadeIn.duration(180)}
        onLayout={(e) => setBubbleH(e.nativeEvent.layout.height)}
        style={[styles.bubbleWrap, { top }]}>
        <View style={[styles.bubble, { backgroundColor: theme.surface }]}>
          <View style={styles.row}>
            <CharlotteFace size={first ? 56 : 40} sparkle={first} />
            <View style={{ flex: 1, gap: 2 }} accessible accessibilityLiveRegion="polite">
              {/* Capped too: at the largest text sizes the bubble would otherwise cover what it explains. */}
              <AppText maxFontSizeMultiplier={MAX_SCALE} style={{ fontFamily: Fonts.bodySemi }}>
                {t.tour.titles[step.id]}
              </AppText>
              <AppText maxFontSizeMultiplier={MAX_SCALE}>{t.tour.steps[step.id]}</AppText>
            </View>
          </View>
          <View style={styles.footer}>
            <AppText variant="caption" color={theme.textSecondary} maxFontSizeMultiplier={MAX_SCALE} style={{ flex: 1 }}>
              {t.tour.step(tour.index + 1, tour.steps.length)}
            </AppText>
            {!last && (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={t.tour.skip}
                onPress={tour.stop}
                style={styles.skip}>
                <AppText
                  variant="callout"
                  color={theme.textSecondary}
                  maxFontSizeMultiplier={MAX_SCALE}
                  style={{ fontFamily: Fonts.bodySemi }}>
                  {t.tour.skip}
                </AppText>
              </PressableScale>
            )}
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={action}
              onPress={last ? tour.stop : tour.next}
              style={[styles.next, { backgroundColor: theme.brand }]}>
              <AppText
                variant="callout"
                color={theme.onBrand}
                maxFontSizeMultiplier={MAX_SCALE}
                style={{ fontFamily: Fonts.bodySemi }}>
                {action}
              </AppText>
            </PressableScale>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', borderRadius: RADIUS, borderWidth: 2, borderColor: '#FFFFFF' },
  bubbleWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: Spacing.gutter },
  bubble: {
    width: '100%',
    maxWidth: MaxContentWidth - Spacing.gutter * 2,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.md,
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  skip: { minHeight: TapTarget, paddingHorizontal: Spacing.md, justifyContent: 'center' },
  next: {
    minHeight: TapTarget,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    justifyContent: 'center',
  },
});
