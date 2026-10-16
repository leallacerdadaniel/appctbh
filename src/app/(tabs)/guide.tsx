import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ChevronDown, MessageCircle } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Linking, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';

import { Screen } from '@/components/screen';
import { normalize, SearchField } from '@/components/search-field';
import { AppText, Button, Card, PressableScale } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, type Lang } from '@/i18n';
import { contacts, guide, type GuideItem } from '@/lib/mock-data';

export default function GuideScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const params = useLocalSearchParams<{ focus?: string; q?: string }>();
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  // Arriving from the Home search bar or a shortcut.
  useFocusEffect(
    useCallback(() => {
      if (params.q) setQuery(params.q);
      if (params.focus) setTimeout(() => inputRef.current?.focus(), 250);
    }, [params.q, params.focus]),
  );

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return guide;
    // Search both languages so a student typing "ménage" in EN mode still finds it.
    return guide.filter((item) =>
      normalize(
        [
          ...Object.values(item.title),
          ...Object.values(item.category),
          item.body[lang],
          ...item.keywords,
        ].join(' '),
      ).includes(q),
    );
  }, [query, lang]);

  return (
    <Screen title={t.guide.title} subtitle={t.guide.subtitle}>
      <SearchField
        ref={inputRef}
        value={query}
        onChangeText={setQuery}
        placeholder={t.guide.searchPlaceholder}
        clearLabel={t.guide.clear}
      />

      {!query && (
        <Animated.View entering={FadeIn} style={styles.chips}>
          {t.guide.suggestions.map((s) => (
            <PressableScale
              key={s}
              onPress={() => setQuery(s)}
              style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <AppText variant="caption">{s}</AppText>
            </PressableScale>
          ))}
        </Animated.View>
      )}

      {results.length === 0 ? (
        <Animated.View entering={FadeInDown}>
          <Card style={{ gap: Spacing.md, alignItems: 'center', paddingVertical: Spacing.xl }}>
            <AppText variant="heading" style={{ textAlign: 'center' }}>
              {t.guide.noResults(query)}
            </AppText>
            <AppText color={theme.textSecondary} style={{ textAlign: 'center' }}>
              {t.guide.noResultsHint}
            </AppText>
            <Button
              label={t.guide.askWhatsapp}
              icon={<MessageCircle size={18} color={theme.onBrand} />}
              onPress={() => Linking.openURL(`https://wa.me/${contacts.whatsapp}`)}
            />
          </Card>
        </Animated.View>
      ) : (
        <View style={{ gap: Spacing.sm }}>
          {results.map((item, i) => (
            <GuideRow
              key={item.id}
              item={item}
              lang={lang}
              index={i}
              open={openId === item.id}
              onToggle={() => setOpenId(openId === item.id ? null : item.id)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function GuideRow({
  item,
  lang,
  index,
  open,
  onToggle,
}: {
  item: GuideItem;
  lang: Lang;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(30 * index)} layout={LinearTransition.duration(200)}>
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <View style={styles.rowHead}>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" color={theme.textSecondary}>
              {item.category[lang]}
            </AppText>
            <AppText style={{ fontFamily: Fonts.bodySemiBold }}>{item.title[lang]}</AppText>
          </View>
          <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
            <ChevronDown size={20} color={theme.textSecondary} />
          </View>
        </View>
        {open && (
          <Animated.View entering={FadeIn.duration(200)}>
            <AppText color={theme.textSecondary} style={{ marginTop: Spacing.sm }}>
              {item.body[lang]}
            </AppText>
          </Animated.View>
        )}
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  row: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
