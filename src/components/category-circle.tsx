import { StyleSheet, Text, View } from 'react-native';

import { AppText, PressableScale } from '@/components/ui';
import { Shadow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Colorful category: emoji in a white circle + short label. The only place emoji are used.
 * `expanded` is for a circle that opens a choice under its row instead of a page: dark ring while it is open.
 */
export function CategoryCircle({
  emoji,
  label,
  onPress,
  expanded,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
  expanded?: boolean;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      onPress={onPress}
      style={styles.item}>
      <View
        style={[
          styles.circle,
          Shadow.card,
          { backgroundColor: theme.surface, borderColor: expanded ? theme.text : 'transparent' },
        ]}>
        <Text style={styles.emoji} allowFontScaling={false}>
          {emoji}
        </Text>
      </View>
      <AppText variant="caption" style={{ textAlign: 'center' }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  item: { width: 76, alignItems: 'center', gap: 6 },
  circle: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 28, lineHeight: 34 },
});
