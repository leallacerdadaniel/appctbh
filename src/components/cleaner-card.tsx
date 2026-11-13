import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { RowPill } from '@/components/home-v3';
import { Icon } from '@/components/icon';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { person, useHome } from '@/lib/home';
import { trackAction } from '@/lib/usage';

/** Digits only, with Brazil's 55 in front when the team typed a local number. */
const waNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
};

/**
 * Who cleans the apartment (owner, 2026-11-08: "o nome da faxineira que vai no apto, o telefone dela").
 * The phone only comes when she agreed to share it; the WhatsApp message is prefilled in Portuguese, her
 * language (on purpose, like the address shown to drivers). Nothing renders until the team fills it in.
 */
export function CleanerCard() {
  const theme = useTheme();
  const { t } = useI18n();
  const { cleaner, student, apartment } = useHome();
  if (!cleaner) return null;
  const c = t.cleaner;
  const initials = person(cleaner.name).initials;
  const firstName = person(cleaner.name).firstName;
  const unit = apartment.complement ? ` do apartamento ${apartment.complement}` : '';
  const hello = `Olá ${firstName}, aqui é ${student.firstName}${unit}. `;

  return (
    <View style={[styles.card, Shadow.card, { backgroundColor: theme.surface }]}>
      <View style={styles.top}>
        {cleaner.photoUrl ? (
          <Image source={{ uri: cleaner.photoUrl }} style={styles.avatar} contentFit="cover" accessible={false} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.infoSoft }]}>
            <AppText style={{ fontFamily: Fonts.bodySemi }} color={theme.info}>
              {initials}
            </AppText>
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" color={theme.textSecondary}>
            {c.title}
          </AppText>
          <AppText style={{ fontFamily: Fonts.bodySemi }}>{cleaner.name}</AppText>
          {!cleaner.phone && (
            <AppText variant="caption" color={theme.textSecondary}>
              {c.noPhone}
            </AppText>
          )}
        </View>
      </View>
      {cleaner.phone && (
        <View style={styles.actions}>
          <RowPill
            primary
            label={c.whatsapp}
            onPress={() => {
              trackAction('open_whatsapp', 'cleaner');
              Linking.openURL(`https://wa.me/${waNumber(cleaner.phone!)}?text=${encodeURIComponent(hello)}`);
            }}
          />
          <RowPill label={c.call} onPress={() => Linking.openURL(`tel:${cleaner.phone!.replace(/[^\d+]/g, '')}`)} />
        </View>
      )}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={c.speaksPt}
        onPress={() => router.push({ pathname: '/portuguese/[situation]', params: { situation: 'building' } } as Href)}
        style={[styles.phrases, { backgroundColor: theme.background }]}>
        <Icon name="translate" size={16} color={theme.info} />
        <AppText variant="callout" style={{ flex: 1 }}>
          {c.speaksPt}
        </AppText>
        <Icon name="chevronRight" size={14} color={theme.textTertiary} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, padding: 14, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  phrases: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
  },
});
