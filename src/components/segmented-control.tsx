import { StyleSheet, View } from 'react-native';

import { AppText, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Switches views of one screen: `fill` track, the selected option a white pill. Filters use `Chip`s. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: theme.fill }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            // 36 pt pill inside a 4 pt track padding: the slop brings the touch area to 44 pt.
            hitSlop={{ top: 4, bottom: 4 }}
            style={[styles.segment, selected && [Shadow.card, { backgroundColor: theme.surface }]]}>
            <AppText
              variant="callout"
              color={selected ? theme.text : theme.textSecondary}
              style={[{ textAlign: 'center' }, selected && { fontFamily: Fonts.bodyMedium }]}>
              {o.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 4, borderRadius: Radius.pill },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 4,
    borderRadius: Radius.pill,
  },
});
