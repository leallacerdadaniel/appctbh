import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { CharlotteFace } from '@/components/charlotte';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useTour } from '@/lib/tour';

type Rect = { x: number; y: number; w: number; h: number };
const PAD = 8;
const RADIUS = 18;

/** Full-screen rectangle with a rounded hole where the target is (even-odd fill). */
function holePath(W: number, H: number, r: Rect) {
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
 * bubble placed above or below. "Passer" is always there; touches outside the bubble do nothing.
 */
export function TourOverlay() {
  const theme = useTheme();
  const { t } = useI18n();
  const tour = useTour();
  const { width: W, height: H } = useWindowDimensions();
  // The measured hole belongs to one step: a new step shows no hole until its target is measured.
  const [measured, setMeasured] = useState<{ step: string; rect: Rect } | null>(null);

  const step = tour && tour.index != null ? tour.steps[tour.index] : null;
  const target = step?.target ? tour?.target(step.target) : undefined;

  useEffect(() => {
    if (!step || !target?.current) return;
    target.current.measureInWindow((x, y, w, h) => {
      if (w > 0 && h > 0) setMeasured({ step: step.id, rect: { x, y, w, h } });
    });
  }, [target, step]);
  const rect = step && measured?.step === step.id ? measured.rect : null;

  if (!tour || tour.index == null || !step) return null;
  const last = tour.index === tour.steps.length - 1;
  const first = tour.index === 0;
  const below = rect ? rect.y + rect.h / 2 < H * 0.5 : false;
  const bubblePosition = rect
    ? below
      ? { top: rect.y + rect.h + PAD + 14 }
      : { bottom: H - rect.y + PAD + 14 }
    : { top: H * 0.3 };

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path
          d={rect ? holePath(W, H, rect) : `M0 0H${W}V${H}H0Z`}
          fill="rgba(10,10,14,0.66)"
          fillRule="evenodd"
        />
      </Svg>
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
        style={[styles.bubbleWrap, bubblePosition]}>
        <View style={[styles.bubble, { backgroundColor: theme.surface }]}>
          <View style={styles.row}>
            <CharlotteFace size={first || last ? 56 : 40} sparkle={first} />
            <AppText style={{ flex: 1 }} accessibilityLiveRegion="polite">
              {t.tour.steps[step.id]}
            </AppText>
          </View>
          <View style={styles.footer}>
            <AppText variant="caption" color={theme.textSecondary} style={{ flex: 1 }}>
              {t.tour.step(tour.index + 1, tour.steps.length)}
            </AppText>
            {!last && (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={t.tour.skip}
                onPress={tour.stop}
                style={styles.skip}>
                <AppText variant="callout" color={theme.textSecondary} style={{ fontFamily: Fonts.bodySemi }}>
                  {t.tour.skip}
                </AppText>
              </PressableScale>
            )}
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={last ? t.tour.done : first ? t.tour.start : t.tour.next}
              onPress={last ? tour.stop : tour.next}
              style={[styles.next, { backgroundColor: theme.brand }]}>
              <AppText variant="callout" color={theme.onBrand} style={{ fontFamily: Fonts.bodySemi }}>
                {last ? t.tour.done : first ? t.tour.start : t.tour.next}
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
