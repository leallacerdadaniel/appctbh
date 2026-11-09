import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { HeroCard } from '@/components/hero-card';
import { Icon, type IconName } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { rentMonthLabel, requestHref, requestTitle } from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Card, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { getAttraction } from '@/lib/attractions';
import { daysUntil, upcomingCleanings } from '@/lib/cleaning';
import type { EventKind } from '@/lib/events';
import { formatDayDate, formatTime, isFutureMonth, shortAddress } from '@/lib/format';
import { useHome, useHomeState } from '@/lib/home';
import { upcomingEvents } from '@/lib/home-feed';
import { contacts } from '@/lib/mock-data';
import { isOpen, useRequests } from '@/lib/requests';
import { trackAction } from '@/lib/usage';

const EVENT_ICON: Record<EventKind, IconName> = {
  national: 'calendar',
  city: 'calendar',
  optional: 'calendar',
  cleaning: 'cleaning',
  contract: 'key',
};

/** Home only previews the agenda; the full list is the Agenda tab. */
const UPCOMING_MAX = 3;

/** Photo of the "Explorer" invitation card. */
const EXPLORE_PHOTO = getAttraction('praca-liberdade')?.photo;

/**
 * Accueil (structure by task, owner 2026-11-08): what needs the student now, as rows that only appear
 * when relevant (rent due, cleaning today or tomorrow, open requests), the next dates, and the two
 * shortcuts used every day (Wi‑Fi, WhatsApp). Everything else lives in its tab: shared expenses in
 * Maison, SOS in the brand bar, the "around you" categories in BH.
 */
export default function HomeScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { student, apartment, contract, cleanings, payments } = useHome();
  const { refresh } = useHomeState();
  const { state: requestsState, reload: reloadRequests } = useRequests();
  const colon = lang === 'fr' ? ' : ' : ': ';

  // Rent months already due and not paid (the current one, or an older one still pending).
  const dueRent = payments.filter((m) => !m.paid && !isFutureMonth(m.month));
  const nextCleaning = upcomingCleanings(cleanings)[0];
  const cleaningSoon = nextCleaning && daysUntil(nextCleaning.date) <= 1 ? nextCleaning : null;
  const openRequests = requestsState.status === 'ready' ? requestsState.data.requests.filter(isOpen) : [];
  // The cleaning row above already says it: don't repeat it in "À venir".
  const upcoming = upcomingEvents({ cleanings, ...contract })
    .filter((e) => !(cleaningSoon && e.kind === 'cleaning'))
    .slice(0, UPCOMING_MAX);

  async function copyWifi() {
    if (!apartment.wifiPassword) return toast(t.common.soon);
    await Clipboard.setStringAsync(apartment.wifiPassword);
    trackAction('copy_wifi');
    toast(t.home.wifiCopied);
  }

  return (
    <Screen onRefresh={() => Promise.all([refresh(), reloadRequests()])}>
      <View style={styles.greeting}>
        <View style={{ flex: 1, gap: Spacing.xs }}>
          <AppText variant="display">
            {new Date().getHours() < 18 ? t.home.morning : t.home.evening}, {student.firstName}
          </AppText>
          <AppText color={theme.textSecondary}>
            {[shortAddress(apartment.address), apartment.complement].filter(Boolean).join(', ')}
          </AppText>
        </View>
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
        title={
          /^\d/.test(apartment.complement)
            ? `${t.apartment.unit} ${apartment.complement}`
            : apartment.complement || shortAddress(apartment.address)
        }
        cta={t.home.seeApartment}
        onPress={() => router.navigate('/maison')}
      />

      {/* Only what needs attention now; each row appears only when it is relevant. */}
      {(dueRent.length > 0 || cleaningSoon || openRequests.length > 0) && (
        <Card style={styles.listCard}>
          <ListGroup inset>
            {dueRent.length > 0 && (
              <ListRow
                icon="rent"
                title={
                  dueRent.length === 1
                    ? t.home.rentDue(rentMonthLabel(dueRent[0].month, lang))
                    : t.home.rentsDue(dueRent.length)
                }
                subtitle={t.home.rentDueHint}
                subtitleColor={theme.warning}
                onPress={() => router.push('/apartment/payments')}
              />
            )}
            {cleaningSoon && (
              <ListRow
                icon="cleaning"
                title={daysUntil(cleaningSoon.date) === 0 ? t.home.cleaningToday : t.home.cleaningTomorrow}
                subtitle={[cleaningSoon.time && formatTime(cleaningSoon.time, lang), t.home.cleaningHint]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={() => router.push('/apartment/cleaning')}
              />
            )}
            {openRequests.length > 0 && (
              <ListRow
                icon="receipt"
                title={t.requests.openCount(openRequests.length)}
                subtitle={openRequests.map((r) => requestTitle(r, t, lang)).join(', ')}
                onPress={() => router.push(requestHref('/requests'))}
              />
            )}
          </ListGroup>
        </Card>
      )}

      <Section
        title={t.home.upcoming}
        subtitle={t.home.upcomingHint}
        action={t.home.seeAgenda}
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
          </ListGroup>
        </Card>
      </Section>

      {EXPLORE_PHOTO && (
        <HeroCard
          photo={{ asset: EXPLORE_PHOTO }}
          label={t.home.exploreLabel}
          labelIcon="map"
          title={t.home.exploreTitle}
          cta={t.home.exploreCta}
          onPress={() => router.navigate({ pathname: '/bh', params: { section: 'explorer' } })}
        />
      )}
    </Screen>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  greeting: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: -Spacing.sm },
  profile: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
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
