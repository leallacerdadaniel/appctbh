import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListGroup, ListRow } from '@/components/list';
import {
  billingMonthLabel,
  requestIcon,
  requestTitle,
  requestWhen,
  StarRating,
  StatusPill,
  Timeline,
} from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, InlineMessage, Input } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatBrl } from '@/lib/format';
import { useStore } from '@/store';
import { cancelRequest, rateRequest } from '@/store/actions';
import { requestById, serviceById, serviceTotal } from '@/store/selectors';
import type { AnyRequest } from '@/store/types';

const CANCELLABLE: AnyRequest['status'][] = ['received', 'scheduled'];

/** One request: summary, progress timeline, cancel while possible, rating once done. */
export default function RequestDetailScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const toast = useToast();
  const r = t.requests;
  const { id } = useLocalSearchParams<{ id: string }>();
  const req = useStore((s) => requestById(s, id));

  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(false);
  const [error, setError] = useState(false);

  if (!req) {
    return (
      <Screen back title={r.title}>
        <Card>
          <AppText color={theme.textSecondary}>{r.notFound}</AppText>
        </Card>
      </Screen>
    );
  }

  const title = requestTitle(req, lang, t);
  const billed = req.status !== 'cancelled' && req.status !== 'declined';

  async function cancel() {
    if (!req) return;
    setCancelling(true);
    setError(false);
    try {
      await cancelRequest(req.id);
      toast(r.cancelled);
      setConfirming(false);
    } catch {
      setError(true);
    } finally {
      setCancelling(false);
    }
  }

  async function sendRating() {
    if (!req || !stars) return;
    setRating(true);
    setError(false);
    try {
      await rateRequest(req.id, stars, comment);
      toast(r.rated);
    } catch {
      setError(true);
    } finally {
      setRating(false);
    }
  }

  const rows = summaryRows(req);

  function summaryRows(x: AnyRequest) {
    const out: { key: string; title: string; value?: string; subtitle?: string }[] = [];
    if (x.kind === 'service') {
      const svc = serviceById(x.serviceId);
      if (svc?.allowsQuantity) out.push({ key: 'qty', title: r.quantity, value: `${x.quantity} · ${svc.unit[lang]}` });
      out.push({
        key: 'price',
        title: r.unitPrice,
        value: svc ? r.priceUnit(formatBrl(x.unitPriceBrl, lang), svc.unit[lang]) : formatBrl(x.unitPriceBrl, lang),
      });
      out.push({
        key: 'total',
        title: r.total,
        value: formatBrl(serviceTotal(x), lang),
        subtitle: billed ? r.billedWith(billingMonthLabel(x.date, lang)) : r.notBilled,
      });
    } else if (x.kind === 'maintenance') {
      out.push({ key: 'room', title: r.room, value: x.room });
      out.push({ key: 'urgency', title: r.urgency, value: r.urgencies[x.urgency] });
      out.push({ key: 'desc', title: r.description, subtitle: x.description });
    } else if (x.kind === 'gourmet') {
      out.push({ key: 'guests', title: r.guests, value: r.guestsValue(x.guests) });
    } else if (x.feeBrl) {
      out.push({
        key: 'fee',
        title: r.fee,
        value: formatBrl(x.feeBrl, lang),
        subtitle: billed ? r.billedWith(billingMonthLabel(x.date, lang)) : r.notBilled,
      });
    }
    if (x.note) out.push({ key: 'note', title: r.note, subtitle: x.note });
    return out;
  }

  return (
    <Screen back title={title} subtitle={r.kinds[req.kind]}>
      <Card style={styles.listCard}>
        <ListGroup>
          <ListRow
            icon={requestIcon(req)}
            title={requestWhen(req, lang, t)}
            accessory={<StatusPill status={req.status} />}
          />
          {rows.map((row) => (
            <ListRow key={row.key} title={row.title} value={row.value} subtitle={row.subtitle} />
          ))}
        </ListGroup>
      </Card>

      {req.kind === 'maintenance' && req.photoUris.length > 0 && (
        <View style={styles.photos}>
          {req.photoUris.map((uri) => (
            <Image
              key={uri}
              source={{ uri }}
              style={[styles.photo, { backgroundColor: theme.fill }]}
              contentFit="cover"
            />
          ))}
        </View>
      )}

      <Section title={r.timeline}>
        <Card>
          <Timeline events={req.events} />
        </Card>
      </Section>

      {req.status === 'done' && (
        <Section title={r.rateTitle} subtitle={req.rating ? undefined : r.rateSubtitle}>
          <Card style={styles.rateCard}>
            {req.rating ? (
              <>
                <AppText variant="callout" color={theme.textSecondary}>
                  {r.yourRating}
                </AppText>
                <StarRating value={req.rating} size={22} />
                {req.ratingComment && <AppText>{req.ratingComment}</AppText>}
              </>
            ) : (
              <>
                <StarRating value={stars} onChange={setStars} />
                <Input
                  label={r.rateComment}
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  style={styles.multiline}
                />
                <Button label={r.rateSend} onPress={sendRating} loading={rating} disabled={!stars} />
              </>
            )}
          </Card>
        </Section>
      )}

      {error && <InlineMessage kind="error" text={r.error} />}

      {CANCELLABLE.includes(req.status) &&
        (confirming ? (
          <View style={styles.group}>
            <AppText variant="callout" color={theme.textSecondary}>
              {r.cancelHint}
            </AppText>
            <Button label={r.cancelConfirm} onPress={cancel} loading={cancelling} />
            <Button variant="plain" label={r.cancelKeep} onPress={() => setConfirming(false)} />
          </View>
        ) : (
          <Button variant="secondary" label={r.cancel} onPress={() => setConfirming(true)} />
        ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
  photos: { flexDirection: 'row', gap: Spacing.sm },
  photo: { flex: 1, aspectRatio: 1, maxWidth: 160, borderRadius: Radius.md },
  rateCard: { gap: Spacing.md },
  multiline: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' },
  group: { gap: Spacing.sm },
});
