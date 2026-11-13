import { useLocalSearchParams } from 'expo-router';

import { BhEventsList } from '@/components/bh-events-ui';
import { Screen } from '@/components/screen';
import { useI18n } from '@/i18n';
import { BH_EVENT_CATEGORIES, useBhEvents, type BhEventCategory } from '@/lib/bh-events';

/**
 * Agenda de BH: everything on in the next 30 days (CCBB BH, Palácio das Artes, the city's open data and the
 * links the team pastes), filters by category and "ce week-end", grouped by day. Opened from Explorer's
 * "Cette semaine à BH" (`/events?category=show` opens on a category).
 */
export default function EventsScreen() {
  const { t } = useI18n();
  const { state, reload } = useBhEvents();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const initial = BH_EVENT_CATEGORIES.includes(category as BhEventCategory) ? (category as BhEventCategory) : undefined;

  return (
    <Screen back title={t.bhEvents.pageTitle} subtitle={t.bhEvents.pageSubtitle} onRefresh={reload}>
      <BhEventsList state={state} onRetry={reload} initialCategory={initial} />
    </Screen>
  );
}
