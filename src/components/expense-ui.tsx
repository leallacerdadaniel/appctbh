import { StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { AppText, Avatar, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Lang } from '@/i18n';
import type { Currency, Member } from '@/lib/expenses';

/**
 * Building blocks of the shared-expenses screens (Splitwise-like, in the app's visual language).
 */

/** "28 / oct." block at the start of an activity row. */
export function DateBlock({ iso, lang }: { iso: string; lang: Lang }) {
  const theme = useTheme();
  const [y, m, d] = iso.split('-').map(Number);
  const month = new Date(y, m - 1, d).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' });
  return (
    <View style={[styles.dateBlock, { backgroundColor: theme.fill }]}>
      <AppText variant="title" style={{ lineHeight: 20 }}>
        {d}
      </AppText>
      <AppText variant="caption" color={theme.textSecondary} style={{ lineHeight: 14 }}>
        {month}
      </AppText>
    </View>
  );
}

/**
 * Roommates as tappable avatars with their first name underneath. Single choice (who paid)
 * or several (split between); the selected ones get a dark ring and a green check.
 */
export function PersonPicker({
  members,
  me,
  meLabel,
  selected,
  onPress,
}: {
  members: Member[];
  me: string;
  meLabel: string;
  selected: string[];
  onPress: (id: string) => void;
}) {
  const theme = useTheme();
  // The student first, then the roommates.
  const ordered = [...members.filter((m) => m.id === me), ...members.filter((m) => m.id !== me)];
  return (
    <View style={styles.people}>
      {ordered.map((m) => {
        const on = selected.includes(m.id);
        const label = m.id === me ? meLabel : m.firstName;
        return (
          <PressableScale
            key={m.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={m.id === me ? meLabel : m.fullName}
            onPress={() => onPress(m.id)}
            style={styles.person}>
            <View style={[styles.ring, { borderColor: on ? theme.text : 'transparent' }]}>
              <Avatar initials={m.initials} size={48} />
            </View>
            {on && (
              <View style={[styles.check, { backgroundColor: theme.success, borderColor: theme.surface }]}>
                <Icon name="check" size={12} color={theme.surface} />
              </View>
            )}
            <AppText
              variant="caption"
              color={on ? theme.text : theme.textSecondary}
              style={[{ textAlign: 'center' }, on && { fontFamily: Fonts.bodyMedium }]}>
              {label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

/** R$ / € switch shown next to an amount. */
export function CurrencyToggle({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.toggle, { backgroundColor: theme.fill }]}>
      {(['BRL', 'EUR'] as const).map((c) => {
        const on = value === c;
        return (
          <PressableScale
            key={c}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={c === 'BRL' ? 'Real' : 'Euro'}
            onPress={() => onChange(c)}
            style={[styles.toggleItem, on && [Shadow.card, { backgroundColor: theme.surface }]]}>
            <AppText
              color={on ? theme.text : theme.textSecondary}
              style={on ? { fontFamily: Fonts.bodyMedium } : undefined}>
              {c === 'BRL' ? 'R$' : '€'}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

/** Large centered amount, like a calculator display, with the currency switch above it. */
export function AmountField({
  value,
  onChangeText,
  currency,
  onCurrencyChange,
  placeholder,
  label,
}: {
  value: string;
  onChangeText: (v: string) => void;
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  placeholder: string;
  label: string;
}) {
  const theme = useTheme();
  const symbol = currency === 'BRL' ? 'R$' : '€';
  // The field grows with what is typed, so the symbol stays right next to the number.
  const width = Math.min(240, ((value || placeholder).length + 1) * 25);
  return (
    <View style={styles.amount}>
      <CurrencyToggle value={currency} onChange={onCurrencyChange} />
      <View style={styles.amountRow}>
        <AppText style={[styles.symbol, { color: theme.textSecondary }]}>{symbol}</AppText>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textTertiary}
          keyboardType="decimal-pad"
          inputMode="decimal"
          style={[styles.amountInput, { color: theme.text, width }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dateBlock: {
    width: 44,
    paddingVertical: 6,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  person: { width: 64, alignItems: 'center', gap: 6 },
  ring: { borderWidth: 2, borderRadius: 30, padding: 2 },
  check: {
    position: 'absolute',
    top: 0,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: { flexDirection: 'row', borderRadius: Radius.pill, padding: 3, gap: 3 },
  toggleItem: { minWidth: 52, paddingVertical: 6, borderRadius: Radius.pill, alignItems: 'center' },
  amount: { alignItems: 'center', gap: Spacing.md },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6 },
  symbol: { fontFamily: Fonts.display, fontSize: 24, lineHeight: 30 },
  amountInput: {
    fontFamily: Fonts.display,
    fontSize: 44,
    lineHeight: 52,
    textAlign: 'left',
    padding: 0,
  },
});
