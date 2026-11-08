import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { AppText, Button, Card } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatDate } from '@/lib/format';
import { inspections, inventory } from '@/store/seed';
import type { InventoryCondition, InventoryItem } from '@/store/types';

/**
 * Inspection report(s) and the furniture inventory by room, as signed at move‑in.
 * The PDF of the report lives in a private bucket once the student signs in (wave 2).
 */
export default function InventoryScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();

  // Rooms in the order they first appear in the inventory.
  const rooms: { name: string; items: InventoryItem[] }[] = [];
  for (const item of inventory) {
    const name = item.room[lang];
    const room = rooms.find((r) => r.name === name);
    if (room) room.items.push(item);
    else rooms.push({ name, items: [item] });
  }

  const conditionColor = (c: InventoryCondition) =>
    c === 'worn' || c === 'damaged' ? theme.warning : theme.textSecondary;

  return (
    <Screen back title={t.house.inventoryTitle} subtitle={t.house.inventorySubtitle}>
      {inspections.map((report) => (
        <Card key={report.id} style={{ gap: Spacing.md }}>
          <View style={styles.reportHead}>
            <Icon name="document" size={22} color={theme.textSecondary} />
            <AppText style={{ flex: 1, fontFamily: Fonts.bodyMedium }}>
              {report.kind === 'move_in' ? t.house.inspection : t.house.inspectionOut}
            </AppText>
          </View>
          <ListGroup>
            <ListRow title={t.house.inspectionDate} value={formatDate(report.date, lang)} />
            <ListRow title={t.house.signedBy} value={report.signedBy} />
            <ListRow title={t.house.photos} value={t.house.photoCount(report.photoCount)} />
          </ListGroup>
          <Button
            variant="secondary"
            disabled
            label={t.house.pdfLater}
            icon={<Icon name="download" size={17} color={theme.text} />}
          />
        </Card>
      ))}

      <Section title={t.house.byRoom} subtitle={t.house.byRoomHint}>
        {rooms.map((room) => (
          <Card key={room.name} style={styles.listCard}>
            <AppText variant="title" style={styles.roomTitle}>
              {room.name}
            </AppText>
            <ListGroup>
              {room.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText>{item.name[lang]}</AppText>
                    <View style={styles.condition}>
                      {item.condition === 'damaged' && (
                        <Icon name="warning" size={13} color={conditionColor(item.condition)} />
                      )}
                      <AppText variant="callout" color={conditionColor(item.condition)}>
                        {t.house.condition[item.condition]}
                      </AppText>
                    </View>
                  </View>
                  <AppText variant="callout" color={theme.textSecondary}>
                    {t.house.quantity(item.quantity)}
                  </AppText>
                </View>
              ))}
            </ListGroup>
          </Card>
        ))}
      </Section>

      <Card style={{ gap: Spacing.md }}>
        <AppText variant="callout" color={theme.textSecondary}>
          {t.house.reportHint}
        </AppText>
        <Button
          variant="secondary"
          label={t.house.reportProblem}
          icon={<Icon name="wrench" size={17} color={theme.text} />}
          onPress={() => router.push('/requests/maintenance' as Href)}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  reportHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  listCard: { paddingVertical: 0 },
  roomTitle: { paddingTop: Spacing.md, paddingBottom: Spacing.xs },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 56, paddingVertical: 14 },
  condition: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
