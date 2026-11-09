import { useCallback, useEffect, useState } from 'react';

import { DocumentCard } from '@/components/document-card';
import { Screen } from '@/components/screen';
import { AppText, Card, LoadingState, RetryCard } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { appApi } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';
import type { AppDocument } from '@/lib/documents.types';
import { useHome } from '@/lib/home';

export default function ContractScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { token } = useAuth();
  const { contract } = useHome();
  const [doc, setDoc] = useState<AppDocument | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(contract.hasDocument ? 'loading' : 'ready');

  // The PDF lives in the private "rental-contracts" bucket: ask app-api for a short-lived link.
  const load = useCallback(() => {
    if (!contract.hasDocument) return;
    appApi<{ url: string; fileName: string | null }>('contract', { token })
      .then((r) => {
        setDoc({
          fileName: r.fileName ?? `Contrat-ChezToi-${contract.semester.replace('/', '-')}.pdf`,
          source: { kind: 'url', url: r.url },
        });
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [token, contract.hasDocument, contract.semester]);

  useEffect(load, [load]);

  return (
    <Screen back title={t.apartment.contract} subtitle={t.apartment.contractHint}>
      {doc ? (
        <DocumentCard doc={doc} title={t.apartment.document} meta={contract.semester} usageItem="contract" />
      ) : status === 'loading' ? (
        <LoadingState label={t.common.loading} />
      ) : status === 'error' ? (
        // The contract exists but the link couldn't be fetched (network): say so, never "bientôt".
        <RetryCard
          message={t.apartment.contractError}
          retryLabel={t.common.retry}
          onRetry={() => {
            setStatus('loading');
            load();
          }}
        />
      ) : (
        <Card>
          <AppText variant="callout" color={theme.textSecondary}>
            {t.apartment.contractSoon}
          </AppText>
        </Card>
      )}
    </Screen>
  );
}
