import { useState } from 'react';

import { ListGroup, ListRow } from '@/components/list';
import { Screen } from '@/components/screen';
import { AppText, Card, InlineMessage, LoadingState, RetryCard } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { communityError, useCommunity, useCommunityActions } from '@/lib/community';

/** People the student blocked: they don't see each other's posts, trips or comments. */
export default function BlockedScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const b = t.community.blocked;
  const act = useCommunityActions();
  const { state, reload } = useCommunity<{ blocked: { id: string; name: string }[] }>('blocks');
  const [error, setError] = useState<string | null>(null);

  async function unblock(id: string) {
    setError(null);
    try {
      await act.unblock(id);
      await reload();
    } catch (e) {
      setError(communityError(e, t));
    }
  }

  return (
    <Screen back title={b.title} onRefresh={reload}>
      {state.status === 'loading' && <LoadingState label={t.common.loading} />}
      {state.status === 'error' && (
        <RetryCard message={t.community.errors.load} retryLabel={t.common.retry} onRetry={reload} />
      )}
      {state.status === 'ready' &&
        (state.data.blocked.length === 0 ? (
          <Card>
            <AppText color={theme.textSecondary}>{b.empty}</AppText>
          </Card>
        ) : (
          <Card style={{ paddingVertical: 0 }}>
            <ListGroup inset>
              {state.data.blocked.map((p) => (
                <ListRow key={p.id} icon="lock" title={p.name} value={b.unblock} onPress={() => unblock(p.id)} />
              ))}
            </ListGroup>
          </Card>
        ))}
      {error && <InlineMessage kind="error" text={error} />}
    </Screen>
  );
}
