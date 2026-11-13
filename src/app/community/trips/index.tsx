import { router, type Href } from 'expo-router';

import { TripCard } from '@/components/community-ui';
import { Screen } from '@/components/screen';
import { AppText, Button, Card, LoadingState, RetryCard } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useCommunity, type CommunityStatus, type Trip } from '@/lib/community';

/** Every group trip still to come; propose one (the guidelines first, if not accepted yet). */
export default function TripsScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const c = t.community;
  const status = useCommunity<CommunityStatus>('status');
  const { state, reload } = useCommunity<{ trips: Trip[] }>('trips');
  const me = status.state.status === 'ready' ? status.state.data : null;

  function propose() {
    if (me && !me.termsAccepted) {
      router.push({ pathname: '/community/charter', params: { next: '/community/trips/edit' } });
    } else {
      router.push('/community/trips/edit');
    }
  }

  return (
    <Screen back title={c.trips.title} subtitle={c.trips.subtitle} onRefresh={() => Promise.all([reload(), status.reload()])}>
      <Button label={c.trips.propose} onPress={propose} disabled={!!me?.suspendedUntil} />
      {state.status === 'loading' && <LoadingState label={t.common.loading} />}
      {state.status === 'error' && <RetryCard message={c.errors.load} retryLabel={t.common.retry} onRetry={reload} />}
      {state.status === 'ready' &&
        (state.data.trips.length === 0 ? (
          <Card>
            <AppText color={theme.textSecondary}>{c.trips.empty}</AppText>
          </Card>
        ) : (
          state.data.trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onPress={() => router.push(`/community/trips/${trip.id}` as Href)} />
          ))
        ))}
    </Screen>
  );
}
