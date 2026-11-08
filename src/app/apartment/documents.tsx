import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, InlineMessage } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatBrl, formatDate } from '@/lib/format';
import { useStore } from '@/store';
import { attachDocument } from '@/store/actions';
import { daysBetween, todayIso } from '@/store/dates';
import { stay } from '@/store/seed';
import type { DocumentType, ResidentDocument } from '@/store/types';

const EXPIRY_WARNING_DAYS = 30;

/**
 * The student's papers (passport, visa, RNM, CPF, insurance, enrollment) with their status,
 * and the deposit. Files go to a private bucket after wave 2; only the team sees them.
 */
export default function DocumentsScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const documents = useStore((s) => s.documents);

  return (
    <Screen back title={t.house.documentsTitle} subtitle={t.house.documentsSubtitle}>
      <View style={styles.privacy}>
        <Icon name="shield" size={17} color={theme.textSecondary} />
        <AppText variant="callout" color={theme.textSecondary} style={{ flex: 1 }}>
          {t.house.privacy}
        </AppText>
      </View>

      <View style={{ gap: Spacing.md }}>
        {documents.map((doc) => (
          <DocumentRow key={doc.id} doc={doc} />
        ))}
      </View>

      <Section title={t.house.deposit} subtitle={t.house.depositHint}>
        <Card style={{ gap: Spacing.sm }}>
          <View style={styles.head}>
            <Icon name="wallet" size={20} color={theme.brand} />
            <AppText variant="title" style={{ flex: 1 }}>
              {formatBrl(stay.depositBrl, lang)}
            </AppText>
          </View>
          <AppText variant="callout" color={theme.textSecondary}>
            {t.house.depositBody(formatBrl(stay.depositBrl, lang))}
          </AppText>
        </Card>
      </Section>
    </Screen>
  );
}

function DocumentRow({ doc }: { doc: ResidentDocument }) {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const name = t.house.docType[doc.type];
  const days = doc.expiresAt ? daysBetween(todayIso(), doc.expiresAt) : undefined;
  const expiringSoon = days !== undefined && days <= EXPIRY_WARNING_DAYS;

  async function pick(type: DocumentType) {
    setFailed(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      setBusy(true);
      await attachDocument(type, { name: file.name, uri: file.uri });
      toast(t.house.sent(name));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const statusColor =
    doc.status === 'validated' ? theme.success : doc.status === 'missing' ? theme.warning : theme.textSecondary;
  const statusBg = doc.status === 'validated' ? theme.successSoft : theme.fill;
  const statusIcon = doc.status === 'validated' ? 'checkCircle' : doc.status === 'missing' ? 'warning' : 'pending';

  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={styles.head}>
        <Icon name="idCard" size={20} color={theme.brand} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText style={{ fontFamily: Fonts.bodyMedium }}>{name}</AppText>
          {doc.number && (
            <AppText variant="callout" color={theme.textSecondary}>
              {t.house.number(doc.number)}
            </AppText>
          )}
          {doc.fileName && (
            <AppText variant="caption" color={theme.textSecondary}>
              {doc.fileName}
            </AppText>
          )}
        </View>
        <View style={[styles.pill, { backgroundColor: statusBg }]}>
          <Icon name={statusIcon} size={13} color={statusColor} />
          <AppText variant="caption" color={statusColor} style={{ fontFamily: Fonts.bodyMedium }}>
            {t.house.docStatus[doc.status]}
          </AppText>
        </View>
      </View>

      {doc.expiresAt && (
        <View style={styles.expiry}>
          {expiringSoon && <Icon name="warning" size={15} color={theme.warning} />}
          <AppText variant="callout" color={expiringSoon ? theme.warning : theme.textSecondary}>
            {expiringSoon
              ? t.house.expiresSoon(formatDate(doc.expiresAt, lang), days!)
              : t.house.expires(formatDate(doc.expiresAt, lang))}
          </AppText>
        </View>
      )}

      <Button
        variant="secondary"
        label={doc.status === 'missing' ? t.house.send : t.house.replace}
        loading={busy}
        onPress={() => pick(doc.type)}
        icon={<Icon name={doc.status === 'missing' ? 'plus' : 'sync'} size={17} color={theme.text} />}
      />
      {failed && <InlineMessage kind="error" text={t.house.pickError} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  privacy: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  expiry: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
});
