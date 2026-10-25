import { Redirect, useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { AppText, Button, Card } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { adminMapsUrl, getAdminProcedure } from '@/lib/admin';

export default function AdminProcedureScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = getAdminProcedure(id);

  if (!p) return <Redirect href="/admin" />;

  return (
    <Screen back title={p.title} subtitle={p.kind[lang]}>
      <AppText style={{ lineHeight: 23 }}>{p.summary[lang]}</AppText>

      <Card style={styles.notice}>
        <Icon name="tip" size={20} color={theme.warning} />
        <AppText style={{ flex: 1 }}>{p.notice[lang]}</AppText>
      </Card>

      <Section title={t.admin.steps}>
        <Card style={styles.list}>
          {p.steps.map((step, i) => (
            <View key={i} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.line }]}>
              <AppText>{`${i + 1}. ${step.title[lang]}`}</AppText>
              <AppText variant="callout" color={theme.textSecondary}>
                {step.body[lang]}
              </AppText>
            </View>
          ))}
        </Card>
      </Section>

      <Section title={p.documentsTitle[lang]}>
        <Card style={styles.list}>
          {p.documents.map((doc, i) => (
            <View key={i} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.line }]}>
              <AppText>{`• ${doc[lang]}`}</AppText>
            </View>
          ))}
        </Card>
        {p.documentsNote && (
          <AppText variant="callout" color={theme.textSecondary}>
            {p.documentsNote[lang]}
          </AppText>
        )}
      </Section>

      <Section title={t.admin.where}>
        <Card style={{ paddingVertical: 0 }}>
          <ListGroup inset>
            <ListRow icon="address" title={p.office.name[lang]} subtitle={p.office.address} />
            {p.office.hours && <ListRow icon="clock" title={t.admin.hours} subtitle={p.office.hours[lang]} />}
            {p.office.phone && (
              <ListRow
                icon="phone"
                title={t.admin.call}
                subtitle={p.office.phone}
                onPress={() => Linking.openURL(`tel:${p.office.phone!.replace(/\s/g, '')}`)}
              />
            )}
          </ListGroup>
        </Card>
        {p.office.note && (
          <AppText variant="callout" color={theme.textSecondary}>
            {p.office.note[lang]}
          </AppText>
        )}
        <Button
          label={t.restaurants.directions}
          icon={<Icon name="directions" size={17} color={theme.onBrand} />}
          onPress={() => Linking.openURL(adminMapsUrl(p.office))}
        />
      </Section>

      <Card style={styles.notice}>
        <Icon name="tip" size={20} color={theme.warning} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" color={theme.textSecondary}>
            {t.travel.tip}
          </AppText>
          <AppText>{p.tip[lang]}</AppText>
        </View>
      </Card>

      <Section title={t.admin.links}>
        <Card style={{ paddingVertical: 0 }}>
          <ListGroup inset>
            {p.links.map((link) => (
              <ListRow key={link.url} icon="website" title={link.label[lang]} onPress={() => Linking.openURL(link.url)} />
            ))}
          </ListGroup>
        </Card>
      </Section>

      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.admin.source}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  list: { paddingVertical: 0 },
  row: { paddingVertical: 14, gap: 4 },
});
