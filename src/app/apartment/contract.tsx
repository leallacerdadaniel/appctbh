import { useEffect, useState } from 'react';

import { DocumentCard } from '@/components/document-card';
import { Screen } from '@/components/screen';
import { AppText, Card } from '@/components/ui';
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
  const [loading, setLoading] = useState(contract.hasDocument);

  // The PDF lives in the private "rental-contracts" bucket: ask app-api for a short-lived link.
  useEffect(() => {
    if (!contract.hasDocument) return;
    appApi<{ url: string; fileName: string | null }>('contract', { token })
      .then((r) =>
        setDoc({
          fileName: r.fileName ?? `Contrat-ChezToi-${contract.semester.replace('/', '-')}.pdf`,
          source: { kind: 'url', url: r.url },
        }),
      )
      .catch(() => setDoc(null))
      .finally(() => setLoading(false));
  }, [token, contract.hasDocument, contract.semester]);

  return (
    <Screen back title={t.apartment.contract} subtitle={t.apartment.contractHint}>
      {doc ? (
        <DocumentCard doc={doc} usageItem="contract" />
      ) : (
        !loading && (
          <Card>
            <AppText variant="callout" color={theme.textSecondary}>
              {t.apartment.contractSoon}
            </AppText>
          </Card>
        )
      )}
    </Screen>
  );
}
