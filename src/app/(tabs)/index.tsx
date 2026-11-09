import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { cloneElement, useRef, useState, type ComponentRef, type ReactElement } from 'react';
import { View, type ScrollView } from 'react-native';

import {
  AddressCard,
  fullAddress,
  QuickActions,
  RowPill,
  TintCard,
  TintRow,
  TonightCarousel,
  WelcomeHero,
} from '@/components/home-v3';
import { EventCard } from '@/components/community-ui';
import type { IconName } from '@/components/icon';
import { rentMonthLabel, requestHref, requestTitle } from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { RecapEntry } from '@/components/recap-ui';
import { SurveyInvite } from '@/components/feedback-ui';
import { AppText } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { choreById, myChoresThisWeek, useChoreActions, useChores } from '@/lib/chores';
import { daysUntil, upcomingCleanings } from '@/lib/cleaning';
import { useCommunity, type ChezEvent } from '@/lib/community';
import type { EventKind } from '@/lib/events';
import { formatDayDate, formatTime, isFutureMonth } from '@/lib/format';
import { useHome, useHomeState, type Home } from '@/lib/home';
import { upcomingEvents } from '@/lib/home-feed';
import { isOpen, useRequests } from '@/lib/requests';
import { trackAction } from '@/lib/usage';
import { TourTarget, useTourScrollTop } from '@/lib/tour';
import { useWelcome, WELCOME_STEPS, type WelcomeStep } from '@/lib/welcome';

/** Rent is due on the 5th: it shows on Accueil from the 2nd, or once late (v3: "aparece só 3 dias antes"). */
const RENT_DAY = 5;
const RENT_NOTICE_DAYS = 3;
/** "Cette semaine": the next 7 days. */
const WEEK_DAYS = 7;
/** The next Chez Toi event shows on Accueil from two weeks before. */
const EVENT_DAYS = 14;

const EVENT_ICON: Record<EventKind, IconName> = {
  national: 'calendar',
  city: 'calendar',
  optional: 'calendar',
  cleaning: 'cleaning',
  contract: 'key',
};

/**
 * Accueil v3 (owner, 2026-11-08: "mix do Airbnb com o Revolut, focado 100% na experiência do aluno").
 * Around the arrival: the neighborhood photo and a 5-step checklist (Wi‑Fi first). Every day after that:
 * the address with Uber and 99 one tap away, quick actions, tonight's ideas and the week of the house.
 * The rent only shows from 3 days before the 5th (or when late): it is never the first thing on the screen.
 */
export default function HomeScreen() {
  const home = useHome();
  const { refresh, state: homeState } = useHomeState();
  const savedAt = homeState.status === 'ready' ? homeState.savedAt : undefined;
  const { reload: reloadRequests } = useRequests();
  const { reload: reloadChores } = useChores();
  const theme = useTheme();
  const { t, lang } = useI18n();
  const params = useLocalSearchParams<{ welcome?: string }>();
  const welcome = useWelcome(home, params.welcome === '1');
  const { student, apartment } = home;
  // The tour scrolls Accueil back to the top before it measures what it points at.
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useTourScrollTop(scrollRef);

  const reload = () => Promise.all([refresh(), reloadRequests(), reloadChores()]);

  if (!welcome.loaded) return <Screen>{null}</Screen>;

  if (welcome.visible) {
    const days = welcome.days ?? 0;
    const badge = days > 0 ? t.today.arrivalIn(days) : days === 0 ? t.today.arrivalToday : t.today.firstDays;
    return (
      <Screen
        onPhoto
        scrollRef={scrollRef}
        onRefresh={reload}
        header={<WelcomeHero apartment={apartment} badge={badge} title={t.today.welcome(student.firstName)} />}>
        <TourTarget id="checklist">
          <WelcomeChecklist home={home} done={welcome.done} onDone={welcome.markDone} onHide={welcome.hide} />
        </TourTarget>
        <TourTarget id="quick">
          <QuickActions apartment={apartment} />
        </TourTarget>
        <TonightSection />
        <WeekSection />
        <NextEventSection />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={reload} scrollRef={scrollRef}>
      {savedAt && <OfflineNotice savedAt={savedAt} />}
      <View style={{ gap: 2, marginTop: -Spacing.sm }}>
        <AppText variant="callout" color={theme.textSecondary}>
          {capitalize(formatDayDate(todayIso(), lang))}
        </AppText>
        <AppText variant="display">
          {new Date().getHours() < 18 ? t.home.morning : t.home.evening}, {student.firstName}
        </AppText>
      </View>
      <View style={{ gap: Spacing.lg, marginTop: -Spacing.md }}>
        <TourTarget id="address">
          <AddressCard apartment={apartment} />
        </TourTarget>
        <TourTarget id="quick">
          <QuickActions apartment={apartment} />
        </TourTarget>
      </View>
      <TonightSection />
      <WeekSection />
      <NextEventSection />
      {/* Wave 14: the stay survey, only while it is due (middle and end of the stay). */}
      <SurveyInvite />
      <RecapEntry />
    </Screen>
  );
}

/** No connection: the screen shows the copy kept on the phone, and says from when. */
function OfflineNotice({ savedAt }: { savedAt: string }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const when = `${formatDayDate(savedAt.slice(0, 10), lang)} · ${formatTime(new Date(savedAt).toTimeString().slice(0, 5), lang)}`;
  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      style={{ gap: 2, padding: Spacing.md, borderRadius: 16, backgroundColor: theme.warningSoft, marginBottom: -Spacing.md }}>
      <AppText variant="callout" color={theme.warning} style={{ fontFamily: Fonts.bodySemi }}>
        {t.offline.banner(when)}
      </AppText>
      <AppText variant="caption" color={theme.textSecondary}>
        {t.offline.hint}
      </AppText>
    </View>
  );
}

function TonightSection() {
  const { t } = useI18n();
  return (
    <Section
      title={t.today.tonight}
      action={t.today.tonightAction}
      onAction={() => router.navigate('/explorer')}>
      <TonightCarousel />
    </Section>
  );
}

/**
 * The next Chez Toi event, when there is one in the next two weeks (UX review 2026-11-09: the community
 * was hard to find). Nothing at all while it loads, fails or when nothing is planned.
 */
function NextEventSection() {
  const { t } = useI18n();
  const { state } = useCommunity<{ events: ChezEvent[] }>('events');
  const [now] = useState(() => Date.now());
  if (state.status !== 'ready') return null;
  const event = state.data.events
    .filter((e) => !e.cancelled)
    .filter((e) => {
      const at = Date.parse(e.startsAt);
      // An event that started less than 3 hours ago still shows (it may be on right now).
      return at >= now - 3 * 3_600_000 && at <= now + EVENT_DAYS * 86_400_000;
    })
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
  if (!event) return null;
  return (
    <Section title={t.today.nextEvent} action={t.community.hubRow} onAction={() => router.push('/community' as Href)}>
      <EventCard
        event={event}
        onPress={() => router.push(`/community/events/${event.id}` as Href)}
      />
    </Section>
  );
}

/* ---------- Arrival checklist ---------- */

function WelcomeChecklist({
  home,
  done,
  onDone,
  onHide,
}: {
  home: Home;
  done: WelcomeStep[];
  onDone: (step: WelcomeStep) => void;
  onHide: () => void;
}) {
  const theme = useTheme();
  const toast = useToast();
  const { t } = useI18n();
  const s = t.today.steps;
  const { apartment, roommates } = home;
  const count = WELCOME_STEPS.filter((x) => done.includes(x)).length;

  async function copy(text: string, step: WelcomeStep, message: string) {
    await Clipboard.setStringAsync(text);
    trackAction('welcome_step', step);
    onDone(step);
    toast(message);
  }
  function go(step: WelcomeStep, href: Href) {
    trackAction('welcome_step', step);
    onDone(step);
    router.push(href);
  }

  const isDone = (step: WelcomeStep) => done.includes(step);
  const names = roommates.map((r) => r.firstName);
  const namesText = names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}` : names[0];

  return (
    <View style={{ gap: Spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm }}>
        <AppText variant="title" style={{ flex: 1 }}>
          {t.today.start}
        </AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {t.today.progress(count, WELCOME_STEPS.length)}
        </AppText>
      </View>
      <View
        style={{ flexDirection: 'row', gap: 4 }}
        accessible
        accessibilityLabel={t.today.progress(count, WELCOME_STEPS.length)}>
        {WELCOME_STEPS.map((step, i) => (
          <View
            key={step}
            style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < count ? theme.success : theme.track }}
          />
        ))}
      </View>
      <TintCard>
        <TintRow
          first
          icon="wifi"
          tint={theme.brandSoft}
          ink={theme.brand}
          done={isDone('wifi')}
          title={s.wifi}
          subtitle={apartment.wifiName ? s.wifiHint(apartment.wifiName) : s.wifiNoInfo}
          accessory={
            apartment.wifiPassword && !isDone('wifi') ? (
              <RowPill primary label={t.today.copy} onPress={() => copy(apartment.wifiPassword!, 'wifi', t.today.wifiCopied)} />
            ) : (
              <View />
            )
          }
        />
        <TintRow
          icon="address"
          tint={theme.infoSoft}
          ink={theme.info}
          done={isDone('address')}
          title={s.address}
          subtitle={s.addressHint}
          accessory={
            <RowPill label={t.today.copy} onPress={() => copy(fullAddress(apartment), 'address', t.today.addressCopied)} />
          }
        />
        <TintRow
          icon="apps"
          tint={theme.warningSoft}
          ink={theme.warning}
          done={isDone('apps')}
          title={s.apps}
          subtitle={`Uber, 99, iFood, Nubank · ${s.appsHint}`}
          onPress={() => go('apps', '/first-steps' as Href)}
        />
        <TintRow
          icon="people"
          tint={theme.successSoft}
          ink={theme.success}
          done={isDone('roommates')}
          title={names.length ? s.roommates(namesText) : s.roommatesAlone}
          subtitle={s.roommatesHint}
          onPress={() => go('roommates', '/apartment/roommates')}
        />
        <TintRow
          icon="document"
          tint={theme.fill}
          ink={theme.text}
          done={isDone('rules')}
          title={s.rules}
          subtitle={s.rulesHint}
          onPress={() => go('rules', '/apartment/rules')}
        />
      </TintCard>
      <View style={{ alignItems: 'flex-end', marginTop: -Spacing.xs }}>
        <RowPill label={t.today.hideStart} onPress={onHide} />
      </View>
    </View>
  );
}

/* ---------- This week ---------- */

function WeekSection() {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { contract, cleanings, payments, cleaner } = useHome();
  const { state: requestsState } = useRequests();
  const { state: choresState } = useChores();
  const choreActions = useChoreActions();

  // Rent: from 3 days before the 5th, or when a month is late. Never earlier (v3).
  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const unpaid = payments.filter((m) => !m.paid && !isFutureMonth(m.month));
  const late = unpaid.filter((m) => m.month < thisMonth || (m.month === thisMonth && today.getDate() > RENT_DAY));
  const daysToRent = RENT_DAY - today.getDate();
  const soon =
    late.length === 0 && daysToRent >= 0 && daysToRent <= RENT_NOTICE_DAYS
      ? unpaid.find((m) => m.month === thisMonth)
      : undefined;

  const choresData = choresState.status === 'ready' ? choresState.data : null;
  const myChores = choresData ? myChoresThisWeek(choresData).filter((i) => !i.done) : [];
  const nextCleaning = upcomingCleanings(cleanings).find((c) => daysUntil(c.date) <= WEEK_DAYS);
  const openRequests = requestsState.status === 'ready' ? requestsState.data.requests.filter(isOpen) : [];
  const events = upcomingEvents({ cleanings, ...contract })
    .filter((e) => e.kind !== 'cleaning' && daysUntil(e.date) <= WEEK_DAYS)
    .slice(0, 2);

  const rows: ReactElement<{ first?: boolean }>[] = [];
  if (late.length > 0 || soon) {
    const month = rentMonthLabel((late[0] ?? soon)!.month, lang);
    rows.push(
      <TintRow
        key="rent"
        icon="pix"
        tint={theme.brandSoft}
        ink={theme.brand}
        title={late.length > 0 ? t.today.rentLate(month) : t.today.rentSoon(month, daysToRent)}
        subtitle={late.length > 0 ? t.home.rentDueHint : t.today.rentHint}
        subtitleColor={late.length > 0 ? theme.warning : undefined}
        accessory={<RowPill primary label={t.today.pay} onPress={() => router.push('/apartment/payments')} />}
      />,
    );
  }
  for (const item of myChores) {
    const chore = choresData && choreById(choresData, item.choreId);
    if (!chore || !choresData) continue;
    rows.push(
      <TintRow
        key={`chore-${item.choreId}`}
        emoji={chore.emoji}
        tint={theme.fill}
        ink={theme.text}
        title={t.home.myChore}
        subtitle={chore.name}
        accessory={
          <RowPill
            dark
            label={t.today.done}
            onPress={() => {
              trackAction('chore_done', 'home');
              choreActions
                .setDone(item.choreId, choresData.weeks[0].weekStart, true, choresData.me)
                .then(() => toast(t.today.doneToast))
                .catch(() => toast(t.chores.errors.action));
            }}
          />
        }
      />,
    );
  }
  if (nextCleaning) {
    rows.push(
      <TintRow
        key="cleaning"
        icon="cleaning"
        tint={theme.infoSoft}
        ink={theme.info}
        title={capitalize(formatDayDate(nextCleaning.date, lang))}
        subtitle={[
          t.home.cleaning,
          nextCleaning.time && formatTime(nextCleaning.time, lang),
          cleaner && t.cleaner.with(cleaner.name.split(' ')[0]),
        ]
          .filter(Boolean)
          .join(' · ')}
        onPress={() => router.push('/apartment/cleaning')}
      />,
    );
  }
  if (openRequests.length > 0) {
    rows.push(
      <TintRow
        key="requests"
        icon="receipt"
        tint={theme.warningSoft}
        ink={theme.warning}
        title={t.requests.openCount(openRequests.length)}
        subtitle={openRequests.map((r) => requestTitle(r, t, lang)).join(', ')}
        onPress={() => router.push(requestHref('/requests'))}
      />,
    );
  }
  for (const e of events) {
    rows.push(
      <TintRow
        key={e.id}
        icon={EVENT_ICON[e.kind]}
        tint={theme.fill}
        ink={theme.text}
        title={e.title[lang]}
        subtitle={[capitalize(formatDayDate(e.date, lang)), e.time && formatTime(e.time, lang)].filter(Boolean).join(' · ')}
        onPress={() => router.push('/calendar')}
      />,
    );
  }

  return (
    <Section title={t.today.week} action={t.today.weekAction} onAction={() => router.push('/calendar')}>
      <TintCard>
        {rows.length === 0 ? (
          <TintRow first icon="calendar" tint={theme.fill} ink={theme.textSecondary} title={t.today.nothing} />
        ) : (
          rows.map((row, i) => (i === 0 ? cloneElement(row, { first: true }) : row))
        )}
      </TintCard>
    </Section>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
