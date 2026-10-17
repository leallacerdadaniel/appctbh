import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { CategoryCircle } from '@/components/category-circle';
import { HeroCard } from '@/components/hero-card';
import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Avatar, Card, PressableScale } from '@/components/ui';
import { Radius, Shadow, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatBrl, formatDate, formatShortDate, formatTime } from '@/lib/format';
import { contacts, demoApartment, demoContract, demoNext, demoRoommates, demoStudent } from '@/lib/mock-data';
import type { NearbyCategoryId } from '@/lib/nearby';

/** Everyday categories shown as circles; they open "À proximité" on that category. */
const CATEGORIES: { id: NearbyCategoryId; emoji: string }[] = [
  { id: 'supermarket', emoji: '🛒' },
  { id: 'pharmacy', emoji: '💊' },
  { id: 'bakery', emoji: '🥐' },
  { id: 'cafe', emoji: '☕' },
  { id: 'gym', emoji: '🏋️' },
  { id: 'laundry', emoji: '🧺' },
  { id: 'mall', emoji: '🛍️' },
  { id: 'bank', emoji: '🏦' },
  { id: 'hospital', emoji: '🏥' },
];

export default function HomeScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { cleaning, payment } = demoNext;

  async function copyWifi() {
    await Clipboard.setStringAsync(demoApartment.wifiPassword);
    toast(t.home.wifiCopied);
  }

  return (
    <Screen>
      <View style={styles.greeting}>
        <View style={{ flex: 1, gap: Spacing.xs }}>
          <AppText variant="display">
            {new Date().getHours() < 18 ? t.home.morning : t.home.evening}, {demoStudent.firstName}
          </AppText>
          <AppText color={theme.textSecondary}>{demoApartment.address}</AppText>
        </View>
        {/* Profile lives here since the tab became "Voyages". */}
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t.profile.title}
          onPress={() => router.push('/profile')}>
          <Avatar initials={demoStudent.initials} size={44} />
        </PressableScale>
      </View>
      <PressableScale
        accessibilityRole="search"
        onPress={() => router.navigate({ pathname: '/guide', params: { focus: '1' } })}
        style={[styles.search, Shadow.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <Icon name="search" size={18} color={theme.textSecondary} />
        <AppText color={theme.textSecondary}>{t.home.searchPlaceholder}</AppText>
      </PressableScale>

      <HeroCard
        photo={{ uri: demoApartment.photoUrl }}
        label={t.home.yourHome}
        labelIcon="home"
        title={demoApartment.nickname}
        subtitle={`${demoApartment.complement} · ${demoApartment.neighborhood}`}
        cta={t.home.seeApartment}
        onPress={() => router.navigate('/apartment')}
      />

      <Section title={t.home.week} subtitle={t.home.weekHint}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            <ListRow
              icon="cleaning"
              title={t.home.cleaning}
              value={`${t.weekdays[cleaning.weekday]} · ${formatTime(cleaning.time, lang)}`}
            />
            <ListRow
              icon="rent"
              title={t.home.rentOf(t.months[payment.month])}
              subtitle={t.home.dueOn(formatShortDate(payment.dueDate, lang))}
              value={formatBrl(payment.amountBrl, lang)}
            />
          </ListGroup>
        </Card>
      </Section>

      <Section title={t.home.shortcuts}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            <ListRow
              icon="wifi"
              title={t.home.wifi}
              subtitle={demoApartment.wifiName}
              onPress={copyWifi}
              accessory={<Icon name="copy" size={17} color={theme.textTertiary} />}
            />
            <ListRow
              icon="whatsapp"
              title={t.home.writeUs}
              subtitle="WhatsApp"
              onPress={() => Linking.openURL(`https://wa.me/${contacts.whatsapp}`)}
            />
            <ListRow
              icon="emergency"
              title={t.home.emergency}
              subtitle={t.home.usefulNumbers}
              onPress={() => router.navigate({ pathname: '/guide', params: { q: t.guide.emergencyQuery } })}
            />
          </ListGroup>
        </Card>
      </Section>

      <Section title={t.home.around} subtitle={t.home.aroundHint}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bleed}
          contentContainerStyle={styles.categories}>
          {CATEGORIES.map((c) => (
            <CategoryCircle
              key={c.id}
              emoji={c.emoji}
              label={t.nearby.short[c.id]}
              onPress={() => router.push({ pathname: '/nearby', params: { category: c.id } })}
            />
          ))}
        </ScrollView>
      </Section>

      <Section title={t.home.roommates}>
        <Card style={styles.roommates}>
          {demoRoommates.map((r) => (
            <View key={r.name} style={styles.roommate}>
              <Avatar initials={r.initials} size={48} />
              <AppText variant="callout">{r.name.split(' ')[0]}</AppText>
            </View>
          ))}
          <View style={{ flex: 1 }} />
          <AppText variant="caption" color={theme.textSecondary} style={styles.contract}>
            {t.home.contract(demoContract.semester)}
            {'\n'}
            {formatDate(demoContract.moveIn, lang)} → {formatDate(demoContract.moveOut, lang)}
          </AppText>
        </Card>
      </Section>

    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: -Spacing.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: TapTarget + 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bleed: { marginHorizontal: -Spacing.gutter },
  // Vertical padding leaves room for the circles' shadow.
  categories: { gap: 4, paddingHorizontal: Spacing.gutter - 6, paddingVertical: 6 },
  listCard: { paddingVertical: 0 },
  roommates: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  roommate: { alignItems: 'center', gap: Spacing.xs, width: 56 },
  contract: { textAlign: 'right' },
});
