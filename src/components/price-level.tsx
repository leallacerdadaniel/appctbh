import { AppText } from '@/components/ui';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Google price level as $$ on a scale of 4, the unused ones dimmed. */
export function PriceLevel({ level }: { level: number }) {
  const theme = useTheme();
  return (
    <AppText variant="caption" style={{ fontFamily: Fonts.bodyMedium, letterSpacing: 1 }}>
      {'$'.repeat(level)}
      <AppText variant="caption" color={theme.line} style={{ fontFamily: Fonts.bodyMedium }}>
        {'$'.repeat(4 - level)}
      </AppText>
    </AppText>
  );
}
