import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListGroup, ListRow } from '@/components/list';
import {
  rentMonthLabel,
  requestErrorText,
  requestIcon,
  requestTitle,
  requestWhen,
  StarRating,
  stampLabel,
  StatusPill,
  Timeline,
} from '@/components/request-ui';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, InlineMessage, Input } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatCents } from '@/lib/format';
import {
  AppApiError,
  billingMonthFor,
  canCancel,
  isOpen,
  localized,
  serviceTotal,
  useRequestActions,
  useRequests,
  type RequestsData,
  type TeamRequest,
} from '@/lib/requests';

/** One request: summary, photos, progress timeline, cancel while possible, rating once done. */
export default function RequestDetailScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const r = t.requests;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, reload } = useRequests();
  const { load } = useRequestActions();
  // The full request (temporary photo links); the list keeps status and timeline fresh.
  const [detail, setDetail] = useState<TeamRequest | null>(null);
  const [failed, setFailed] = useState<'notFound' | 'other' | null>(null);

  function fetchDetail() {
    return load(id)
      .then((d) => {
        setDetail(d);
        setFailed(null);
      })
      .catch((e) => setFailed(e instanceof AppApiError && e.code === 'notFound' ? 'notFound' : 'other'));
  }

  useEffect(() => {
    fetchDetail();
    // Once per request: the actions object is new on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const data = state.status === 'ready' ? state.data : null;
  const listed = data?.requests.find((x) => x.id === id);
  const req = listed ? { ...listed, photoUrls: detail?.photoUrls ?? [] } : detail;

  return (
    <Screen
      back
      title={req ? requestTitle(req, t, lang) : r.title}
      subtitle={req ? r.sentOn(stampLabel(req.createdAt, lang)) : undefined}
      onRefresh={() => Promise.all([reload(), fetchDetail()])}>
      {req ? (
        <Content req={req} data={data} photosLoading={!detail && !failed} />
      ) : failed === 'notFound' ? (
        <Card>
          <AppText color={theme.textSecondary}>{r.notFound}</AppText>
        </Card>
      ) : null}
    </Screen>
  );
}

function Content({
  req,
  data,
  photosLoading,
}: {
  req: TeamRequest;
  data: RequestsData | null;
  photosLoading: boolean;
}) {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const r = t.requests;
  const { cancel, rate } = useRequestActions();

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const money = (cents: number) => formatCents(cents, lang, req.currency);
  const billed = req.status !== 'cancelled' && req.status !== 'declined';
  const svc = data?.catalog.find((c) => c.id === req.serviceId);
  const unit = svc ? localized(svc.unit, lang) : '';
  const rentMonth = req.billingMonth ?? (req.date ? billingMonthFor(req.date) : null);
  const billedLine = !billed ? r.notBilled : rentMonth ? r.billedWith(rentMonthLabel(rentMonth, lang)) : undefined;

  async function onCancel() {
    if (!confirmCancel) return setConfirmCancel(true);
    setError(null);
    setCancelling(true);
    try {
      await cancel(req.id);
      toast(r.cancelled);
    } catch (e) {
      setError(requestErrorText(e, t));
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
  }

  async function sendRating() {
    if (!stars) return setError(r.errors.rating);
    setError(null);
    setRating(true);
    try {
      await rate(req.id, stars, comment.trim() || undefined);
      toast(r.rated);
    } catch (e) {
      setError(requestErrorText(e, t));
    } finally {
      setRating(false);
    }
  }

  return (
    <>
      <Card style={styles.listCard}>
        <ListGroup>
          <ListRow
            icon={requestIcon(req, data?.catalog)}
            title={requestWhen(req, t, lang)}
            accessory={<StatusPill status={req.status} />}
          />
          {req.kind === 'service' && (svc?.allowsQuantity || req.quantity > 1) && (
            <ListRow title={r.quantity} value={unit ? `${req.quantity} · ${unit}` : String(req.quantity)} />
          )}
          {req.kind === 'service' && req.unitPriceCents != null && (
            <ListRow
              title={r.unitPrice}
              value={unit ? r.priceUnit(money(req.unitPriceCents), unit) : money(req.unitPriceCents)}
            />
          )}
          {req.kind === 'service' && (
            <ListRow title={r.total} value={money(serviceTotal(req))} subtitle={billedLine} />
          )}
          {(req.kind === 'late_checkout' || req.kind === 'early_checkin') && (
            <ListRow
              title={r.fee}
              value={req.feeCents != null ? money(req.feeCents) : isOpen(req) ? r.feeToConfirm : r.noFee}
              subtitle={req.feeCents ? billedLine : undefined}
            />
          )}
          {req.kind === 'gourmet' && req.guests != null && <ListRow title={r.guests} value={r.people(req.guests)} />}
          {req.kind === 'maintenance' && req.room && <ListRow title={r.room} value={req.room} />}
          {req.kind === 'maintenance' && req.category && (
            <ListRow title={r.category} value={r.maintenanceCategories[req.category]} />
          )}
          {req.kind === 'maintenance' && req.urgency && (
            <ListRow title={r.urgency} value={r.urgencies[req.urgency]} />
          )}
          {req.kind === 'maintenance' && req.description && (
            <ListRow title={r.description} subtitle={req.description} />
          )}
          {req.note && <ListRow title={r.yourMessage} subtitle={req.note} />}
        </ListGroup>
      </Card>

      {req.photoCount > 0 && (photosLoading || req.photoUrls.length > 0) && (
        <Section title={r.photos}>
          <View style={styles.photos}>
            {photosLoading
              ? Array.from({ length: req.photoCount }, (_, i) => (
                  <View key={i} style={[styles.photo, { backgroundColor: theme.fill }]} />
                ))
              : req.photoUrls.map((uri) => (
                  <Image
                    key={uri}
                    source={{ uri }}
                    style={[styles.photo, { backgroundColor: theme.fill }]}
                    contentFit="cover"
                    transition={150}
                  />
                ))}
          </View>
        </Section>
      )}

      {req.events.length > 0 && (
        <Section title={r.timeline}>
          <Card>
            <Timeline events={req.events} />
          </Card>
        </Section>
      )}

      {req.status === 'done' && (
        <Section title={r.rateTitle} subtitle={req.rating ? undefined : r.rateSubtitle}>
          <Card style={styles.rateCard}>
            {req.rating ? (
              <>
                <AppText variant="callout" color={theme.textSecondary}>
                  {r.yourRating}
                </AppText>
                <StarRating value={req.rating} size={22} />
                {req.ratingComment ? <AppText>{req.ratingComment}</AppText> : null}
              </>
            ) : (
              <>
                <StarRating value={stars} onChange={setStars} />
                <Input
                  label={r.rateComment}
                  value={comment}
                  onChangeText={setComment}
                  multiline
                  maxLength={500}
                  style={styles.multiline}
                />
                <Button label={r.rateSend} onPress={sendRating} loading={rating} />
              </>
            )}
          </Card>
        </Section>
      )}

      {error && <InlineMessage kind="error" text={error} />}

      {canCancel(req) && (
        <View style={styles.group}>
          {confirmCancel && (
            <AppText variant="callout" color={theme.textSecondary}>
              {r.cancelHint}
            </AppText>
          )}
          <Button
            variant="secondary"
            label={confirmCancel ? r.cancelConfirm : r.cancel}
            onPress={onCancel}
            loading={cancelling}
          />
        </View>
      )}
    </>
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
