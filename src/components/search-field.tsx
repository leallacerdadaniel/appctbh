import { Search, X } from 'lucide-react-native';
import { forwardRef, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { PressableScale } from '@/components/ui';
import { Radius, Spacing, TapTarget, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Pill search input with a clear button. */
export const SearchField = forwardRef<
  ComponentRef<typeof TextInput>,
  { value: string; onChangeText: (v: string) => void; placeholder: string; clearLabel: string }
>(function SearchField({ value, onChangeText, placeholder, clearLabel }, ref) {
  const theme = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <Search size={18} color={theme.textSecondary} />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        returnKeyType="search"
        autoCorrect={false}
        style={[Type.body, styles.input, { color: theme.text }]}
      />
      {value.length > 0 && (
        <PressableScale
          accessibilityLabel={clearLabel}
          onPress={() => onChangeText('')}
          style={styles.clear}>
          <X size={16} color={theme.textSecondary} />
        </PressableScale>
      )}
    </View>
  );
});

/** Lowercase and strip accents/hyphens so "menage" matches "Ménage". */
export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‑-]/g, '');
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: TapTarget + 8,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  input: { flex: 1, minHeight: TapTarget, outlineStyle: 'none' } as object,
  clear: { width: TapTarget, height: TapTarget, alignItems: 'center', justifyContent: 'center' },
});
