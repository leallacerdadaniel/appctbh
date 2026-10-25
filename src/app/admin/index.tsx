import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen } from '@/components/screen';
import { AppText, Card } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { adminProcedures } from '@/lib/admin';

/** "Démarches administratives": CPF and migration registration, in the order to do them. */
export default function AdminScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();

  return (
    <Screen back title={t.admin.title} subtitle={t.admin.subtitle}>
      <Card style={styles.notice}>
        <Icon name="tip" size={20} color={theme.warning} />
        <AppText variant="callout" color={theme.textSecondary} style={{ flex: 1 }}>
          {t.admin.intro}
        </AppText>
      </Card>

      <Card style={{ paddingVertical: 0 }}>
        <ListGroup inset>
          {adminProcedures.map((p) => (
            <ListRow
              key={p.id}
              icon="document"
              title={p.title}
              subtitle={p.kind[lang]}
              onPress={() => router.push({ pathname: '/admin/[id]', params: { id: p.id } })}
            />
          ))}
        </ListGroup>
      </Card>

      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.admin.source}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
});
