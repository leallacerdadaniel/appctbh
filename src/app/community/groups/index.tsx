import { router, type Href } from 'expo-router';

import { GroupCard } from '@/components/community-ui';
import { Screen } from '@/components/screen';
import { AppText, Button, Card, LoadingState, RetryCard } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useCommunity, type CommunityStatus, type Group } from '@/lib/community';

/** Every residents' group, the student's own first; create one (the guidelines first, if not accepted yet). */
export default function GroupsScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const c = t.community;
  const status = useCommunity<CommunityStatus>('status');
  const { state, reload } = useCommunity<{ groups: Group[] }>('groups');
  const me = status.state.status === 'ready' ? status.state.data : null;

  function create() {
    if (me && !me.termsAccepted) {
      router.push({ pathname: '/community/charter', params: { next: '/community/groups/edit' } });
    } else {
      router.push('/community/groups/edit' as Href);
    }
  }

  return (
    <Screen back title={c.groups.title} subtitle={c.groups.subtitle} onRefresh={() => Promise.all([reload(), status.reload()])}>
      <Button label={c.groups.create} onPress={create} disabled={!!me?.suspendedUntil} />
      {state.status === 'loading' && <LoadingState label={t.common.loading} />}
      {state.status === 'error' && <RetryCard message={c.errors.load} retryLabel={t.common.retry} onRetry={reload} />}
      {state.status === 'ready' &&
        (state.data.groups.length === 0 ? (
          <Card>
            <AppText color={theme.textSecondary}>{c.groups.empty}</AppText>
          </Card>
        ) : (
          state.data.groups.map((g) => (
            <GroupCard key={g.id} group={g} onPress={() => router.push(`/community/groups/${g.id}` as Href)} />
          ))
        ))}
    </Screen>
  );
}
