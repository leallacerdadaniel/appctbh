import { useState } from 'react';
import { View } from 'react-native';

import { BirthdayCard } from '@/components/birthday-greeting';
import { BrandBar } from '@/components/brand-bar';
import { AppText, Button } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, type Lang } from '@/i18n';

/** TEMPORARY: lets the owner see the birthday card without the server. Delete after approval. */
export default function BirthdayPreview() {
  const theme = useTheme();
  const { setLang } = useI18n();
  const [open, setOpen] = useState(true);

  if (!__DEV__) return null;

  function show(lang: Lang) {
    setLang(lang);
    setOpen(true);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <BrandBar />
      <View style={{ padding: Spacing.gutter, gap: Spacing.md }}>
        <AppText color={theme.textSecondary}>Teste do cartão de aniversário</AppText>
        <Button label="Ver em francês" onPress={() => show('fr')} />
        <Button variant="secondary" label="Ver em inglês" onPress={() => show('en')} />
      </View>
      <BirthdayCard name="Camille" open={open} onClose={() => setOpen(false)} />
    </View>
  );
}
