import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { DocumentCard } from '@/components/document-card';
import { ListGroup, ListRow } from '@/components/list';
import { Screen } from '@/components/screen';
import { AppText, Card } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { appApi } from '@/lib/app-api';
import { useAuth } from '@/lib/auth';
import type { AppDocument } from '@/lib/documents.types';
import { formatDate } from '@/lib/format';
import { useHandovers, type HandoverKind } from '@/lib/handovers';

/** Check-in or check-out page: date, which roommate received / returned the keys, signed report. */
export function HandoverScreen({ kind }: { kind: HandoverKind }) {
  const { t, lang } = useI18n();
  const h = t.apartment.handover;
  const k = h[kind];
  const theme = useTheme();
  const { token } = useAuth();
  const data = useHandovers()?.[kind];
  const [doc, setDoc] = useState<AppDocument | null>(null);

  // The signed PDF lives in a private bucket: ask app-api for a short-lived link.
  useEffect(() => {
    if (!data?.hasDocument) return;
    appApi<{ url: string }>('handover-document', { token, body: { kind } })
      .then((r) => setDoc({ fileName: k.fileName, source: { kind: 'url', url: r.url } }))
      .catch(() => setDoc(null));
  }, [token, kind, data?.hasDocument, k.fileName]);

  return (
    <Screen back title={k.title} subtitle={k.subtitle}>
      {data?.date ? (
        <>
          <Card style={{ paddingVertical: 0 }}>
            <ListGroup inset>
              <ListRow icon="calendar" title={k.date} value={formatDate(data.date, lang)} />
              {data.by && <ListRow icon="profile" title={k.by} value={data.byMe ? h.you : data.by} />}
            </ListGroup>
          </Card>
          <View style={{ gap: Spacing.sm }}>
            {doc ? (
              <DocumentCard doc={doc} title={k.docTitle} usageItem={kind} />
            ) : (
              !data.hasDocument && (
                <AppText variant="callout" color={theme.textSecondary}>
                  {h.docPending}
                </AppText>
              )
            )}
            <AppText variant="caption" color={theme.textSecondary}>
              {k.docNote}
            </AppText>
          </View>
        </>
      ) : (
        data && (
          <Card>
            <AppText variant="callout" color={theme.textSecondary}>
              {k.empty}
            </AppText>
          </Card>
        )
      )}
    </Screen>
  );
}
