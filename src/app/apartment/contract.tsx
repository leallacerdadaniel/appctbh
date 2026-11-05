import { useEffect, useState } from 'react';

import { DocumentCard } from '@/components/document-card';
import { ListGroup, ListRow } from '@/components/list';
import { Screen } from '@/components/screen';
import { Card } from '@/components/ui';
import { useI18n } from '@/i18n';
import { appApi } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';
import type { AppDocument } from '@/lib/documents.types';
import { formatDate, formatMoney } from '@/lib/format';
import { useHome } from '@/lib/home';

export default function ContractScreen() {
  const { t, lang } = useI18n();
  const { token } = useAuth();
  const { contract } = useHome();
  const [doc, setDoc] = useState<AppDocument | null>(null);

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
      .catch(() => setDoc(null));
  }, [token, contract.hasDocument, contract.semester]);

  return (
    <Screen back title={t.apartment.contract} subtitle={t.apartment.contractHint}>
      <Card style={{ paddingVertical: 0 }}>
        <ListGroup>
          <ListRow title={t.apartment.semester} value={contract.semester} />
          <ListRow title={t.apartment.moveIn} value={formatDate(contract.moveIn, lang)} />
          <ListRow title={t.apartment.moveOut} value={formatDate(contract.moveOut, lang)} />
          {contract.rent != null && (
            <ListRow title={t.apartment.monthlyRent} value={formatMoney(contract.rent, contract.currency, lang)} />
          )}
        </ListGroup>
      </Card>
      {doc && <DocumentCard doc={doc} usageItem="contract" />}
    </Screen>
  );
}
