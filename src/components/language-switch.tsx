import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { AppText, PressableScale } from '@/components/ui';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { languages, useI18n } from '@/i18n';

const PADDING = 3;

/** Segmented FR | EN control with a sliding thumb. */
export function LanguageSwitch() {
  const theme = useTheme();
  const { lang, setLang } = useI18n();
  const [segmentWidth, setSegmentWidth] = useState(0);
  const index = languages.indexOf(lang);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(index * segmentWidth, { damping: 20, stiffness: 260 }) }],
  }));

  function onLayout(e: LayoutChangeEvent) {
    setSegmentWidth((e.nativeEvent.layout.width - PADDING * 2) / languages.length);
  }

  return (
    <View
      accessibilityRole="radiogroup"
      onLayout={onLayout}
      style={[styles.track, { backgroundColor: theme.line }]}>
      {segmentWidth > 0 && (
        <Animated.View
          style={[styles.thumb, { width: segmentWidth, backgroundColor: theme.surface }, thumbStyle]}
        />
      )}
      {languages.map((l) => {
        const selected = l === lang;
        return (
          <PressableScale
            key={l}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={l === 'fr' ? 'Français' : 'English'}
            onPress={() => setLang(l)}
            style={styles.segment}>
            <AppText
              variant="caption"
              color={selected ? theme.text : theme.textSecondary}
              style={{ fontFamily: Fonts.bodyMedium }}>
              {l.toUpperCase()}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    padding: PADDING,
    minWidth: 104,
  },
  thumb: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    left: PADDING,
    borderRadius: Radius.pill,
  },
  segment: {
    flex: 1,
    minHeight: 32,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
