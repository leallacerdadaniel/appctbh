import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { CategoryCircle } from '@/components/category-circle';
import { HeroCard } from '@/components/hero-card';
import { Icon, type IconName } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Card, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { getAttraction } from '@/lib/attractions';
import type { EventKind } from '@/lib/events';
import { formatDayDate, formatTime, shortAddress } from '@/lib/format';
import { useBalanceLabel } from '@/lib/expenses';
import { useHome } from '@/lib/home';
import { upcomingEvents } from '@/lib/home-feed';
import { contacts } from '@/lib/mock-data';
import type { NearbyCategoryId } from '@/lib/nearby';
import { trackAction } from '@/lib/usage';

/** Everyday categories shown as circles; they open "À proximité" on that category. */
const CATEGORIES: { id: NearbyCategoryId; emoji: string }[] = [
  { id: 'supermarket', emoji: '🛒' },
  { id: 'pharmacy', emoji: '💊' },
  { id: 'bakery', emoji: '🥐' },
  { id: 'gym', emoji: '🏋️' },
  { id: 'laundry', emoji: '🧺' },
  { id: 'mall', emoji: '🛍️' },
  { id: 'hospital', emoji: '🏥' },
];

const EVENT_ICON: Record<EventKind, IconName> = {
  national: 'calendar',
  city: 'calendar',
  optional: 'calendar',
  cleaning: 'cleaning',
  contract: 'key',
};

/** Photo of the "Explorer" invitation card. */
const EXPLORE_PHOTO = getAttraction('praca-liberdade')?.photo;

export default function HomeScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { student, apartment, contract, cleanings, roommates } = useHome();
  const balance = useBalanceLabel();
  const colon = lang === 'fr' ? ' : ' : ': ';
  const upcoming = upcomingEvents({ cleanings, ...contract });

  async function copyWifi() {
    if (!apartment.wifiPassword) return toast(t.common.soon);
    await Clipboard.setStringAsync(apartment.wifiPassword);
    trackAction('copy_wifi');
    toast(t.home.wifiCopied);
  }

  return (
    <Screen>
      <View style={styles.greeting}>
        <View style={{ flex: 1, gap: Spacing.xs }}>
          <AppText variant="display">
            {new Date().getHours() < 18 ? t.home.morning : t.home.evening}, {student.firstName}
          </AppText>
          <AppText color={theme.textSecondary}>
            {[shortAddress(apartment.address), apartment.complement].filter(Boolean).join(', ')}
          </AppText>
        </View>
        {/* Profile lives here since the tab became "Voyages". */}
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t.profile.title}
          hitSlop={6}
          onPress={() => router.push('/profile')}
          style={[styles.profile, Shadow.card, { backgroundColor: theme.brand }]}>
          <Icon name="profile" size={16} color={theme.onBrand} />
        </PressableScale>
      </View>
      <HeroCard
        photo={{ uri: apartment.photoUrl ?? '' }}
        label={t.home.yourHome}
        labelIcon="home"
        title={apartment.nickname}
        subtitle={
          /^\d/.test(apartment.complement)
            ? `${t.apartment.unit} ${apartment.complement}`
            : apartment.complement || shortAddress(apartment.address)
        }
        cta={t.home.seeApartment}
        onPress={() => router.navigate('/apartment')}
      />

      <Section
        title={t.home.upcoming}
        subtitle={t.home.upcomingHint}
        action={t.home.seeCalendar}
        onAction={() => router.navigate('/calendar')}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            {upcoming.length === 0 ? (
              <ListRow icon="calendar" title={t.home.nothingSoon} />
            ) : (
              upcoming.map((e) => (
                <ListRow
                  key={e.id}
                  icon={EVENT_ICON[e.kind]}
                  title={e.title[lang]}
                  subtitle={[
                    capitalize(formatDayDate(e.date, lang)) +
                      (e.endDate ? ` → ${formatDayDate(e.endDate, lang)}` : ''),
                    e.time && formatTime(e.time, lang),
                    e.kind !== 'cleaning' && e.kind !== 'contract' && t.calendar.kinds[e.kind],
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  onPress={() =>
                    e.kind === 'cleaning' ? router.push('/apartment/cleaning') : router.navigate('/calendar')
                  }
                />
              ))
            )}
          </ListGroup>
        </Card>
      </Section>

      <Section title={t.home.shortcuts}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            {/* Network and password written out; tapping the row copies the password (the pill says so). */}
            <ListRow
              icon="wifi"
              title={t.home.wifi}
              subtitle={
                apartment.wifiName || apartment.wifiPassword
                  ? [
                      apartment.wifiName && `${t.apartment.network}${colon}${apartment.wifiName}`,
                      apartment.wifiPassword && `${t.apartment.password}${colon}${apartment.wifiPassword}`,
                    ]
                      .filter(Boolean)
                      .join('\n')
                  : t.common.soon
              }
              onPress={copyWifi}
              accessibilityLabel={apartment.wifiPassword ? t.apartment.copyPassword : undefined}
              accessory={
                apartment.wifiPassword ? (
                  <View style={[styles.copyPill, { backgroundColor: theme.fill }]}>
                    <Icon name="copy" size={14} color={theme.text} />
                    <AppText variant="caption" style={{ fontFamily: Fonts.bodyMedium }}>
                      {t.home.copy}
                    </AppText>
                  </View>
                ) : (
                  <View />
                )
              }
            />
            <ListRow
              icon="whatsapp"
              title={t.home.writeUs}
              subtitle="WhatsApp"
              onPress={() => {
                trackAction('open_whatsapp', 'home');
                Linking.openURL(`https://wa.me/${contacts.whatsapp}`);
              }}
            />
            {/* Nobody to split with when the student lives alone. */}
            {roommates.length > 0 && (
              <ListRow
                icon="rent"
                title={t.expenses.homeRow}
                subtitle={balance || t.expenses.subtitle}
                onPress={() => router.push('/expenses')}
              />
            )}
            <ListRow
              icon="emergency"
              title={t.home.emergency}
              subtitle={t.home.usefulNumbers}
              onPress={() => router.push('/emergency')}
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

      {EXPLORE_PHOTO && (
        <HeroCard
          photo={{ asset: EXPLORE_PHOTO }}
          label={t.home.exploreLabel}
          labelIcon="map"
          title={t.home.exploreTitle}
          cta={t.home.exploreCta}
          onPress={() => router.navigate('/travel')}
        />
      )}
    </Screen>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  greeting: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: -Spacing.sm },
  profile: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bleed: { marginHorizontal: -Spacing.gutter },
  // Vertical padding leaves room for the circles' shadow.
  categories: { gap: 4, paddingHorizontal: Spacing.gutter - 6, paddingVertical: 6 },
  listCard: { paddingVertical: 0 },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
});
