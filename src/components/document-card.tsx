import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, InlineMessage } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { downloadDocument, openDocument, type AppDocument } from '@/lib/documents';
import { trackAction } from '@/lib/usage';

/** A PDF the student can open or download (contract and signed inspection reports). */
export function DocumentCard({ doc, usageItem }: { doc: AppDocument; usageItem: 'contract' | 'checkin' | 'checkout' }) {
  const theme = useTheme();
  const toast = useToast();
  const { t } = useI18n();
  const [busy, setBusy] = useState<'open' | 'download' | null>(null);
  const [failed, setFailed] = useState(false);

  async function run(action: 'open' | 'download') {
    setBusy(action);
    setFailed(false);
    trackAction('open_document', usageItem);
    try {
      if (action === 'open') await openDocument(doc);
      else {
        await downloadDocument(doc);
        // Native shows the share sheet itself; web saves silently, so confirm it.
        if (Platform.OS === 'web') toast(t.apartment.downloaded);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  const size = doc.sizeBytes
    ? ` · ${Math.max(1, Math.round(doc.sizeBytes / 1024))} ${t.apartment.kilobytes}`
    : '';

  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={styles.row}>
        <Icon name="document" size={22} color={theme.textSecondary} />
        <View style={{ flex: 1 }}>
          <AppText style={{ fontFamily: Fonts.bodyMedium }}>{doc.fileName}</AppText>
          <AppText variant="caption" color={theme.textSecondary}>
            {t.apartment.document}
            {size}
          </AppText>
        </View>
      </View>
      <View style={styles.actions}>
        <View style={{ flex: 1 }}>
          <Button
            variant="secondary"
            label={t.apartment.open}
            icon={<Icon name="show" size={17} color={theme.text} />}
            loading={busy === 'open'}
            disabled={busy !== null}
            onPress={() => run('open')}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={t.apartment.download}
            icon={<Icon name="download" size={17} color={theme.onBrand} />}
            loading={busy === 'download'}
            disabled={busy !== null}
            onPress={() => run('download')}
          />
        </View>
      </View>
      {failed && <InlineMessage kind="error" text={t.apartment.documentError} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  actions: { flexDirection: 'row', gap: Spacing.sm },
});
