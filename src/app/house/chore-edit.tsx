import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmojiPicker, RotationPicker } from '@/components/chore-ui';
import { FieldLabel } from '@/components/request-ui';
import { Screen } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, InlineMessage, Input, LoadingState, RetryCard } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import {
  CHORE_EMOJI,
  choreById,
  choreErrorText,
  memberLabel,
  useChoreActions,
  useChores,
  type ChoresData,
} from '@/lib/chores';

/** New chore, or edit one (?id=): name, emoji, turn order. Delete = deactivate, two taps. */
export default function ChoreEditScreen() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, reload } = useChores();
  // Once deleted, the form stays on screen while it closes (no "doesn't exist" flash).
  const [leaving, setLeaving] = useState(false);
  return (
    <Screen back title={id ? t.chores.editTitle : t.chores.newTitle}>
      {state.status === 'loading' && <LoadingState label={t.common.loading} />}
      {state.status === 'error' && (
        <RetryCard message={t.chores.unavailable} retryLabel={t.common.retry} onRetry={reload} />
      )}
      {state.status === 'ready' &&
        (id && !leaving && !choreById(state.data, id) ? (
          <Card>
            <AppText>{t.chores.notFound}</AppText>
          </Card>
        ) : (
          <Form data={state.data} id={id} onDeleted={() => setLeaving(true)} />
        ))}
    </Screen>
  );
}

function Form({ data, id, onDeleted }: { data: ChoresData; id?: string; onDeleted: () => void }) {
  const toast = useToast();
  const { t } = useI18n();
  const c = t.chores;
  const act = useChoreActions();
  // Read once: the chore leaves the data after a delete, the form doesn't change meanwhile.
  const [existing] = useState(() => (id ? choreById(data, id) : undefined));
  const memberIds = new Set(data.members.map((m) => m.id));

  const [name, setName] = useState(existing?.name ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? CHORE_EMOJI[0]);
  // Someone who moved out can't stay in the order (the server only accepts current roommates).
  const [order, setOrder] = useState<string[]>(existing ? existing.rotation.filter((cp) => memberIds.has(cp)) : []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // An emoji chosen elsewhere stays selectable.
  const emojiOptions = existing && !CHORE_EMOJI.includes(existing.emoji) ? [existing.emoji, ...CHORE_EMOJI] : CHORE_EMOJI;
  const who = (cp: string) => memberLabel(data, cp, c.you, c.formerRoommate);

  async function save() {
    setError(null);
    if (!name.trim()) return setError(c.errors.name);
    if (order.length === 0) return setError(c.errors.rotation);
    setSaving(true);
    try {
      await act.save({ id, emoji, name: name.trim(), rotation: order });
      toast(c.saved);
      router.back();
    } catch (e) {
      setError(choreErrorText(e, t, 'server'));
      setSaving(false);
    }
  }

  async function remove() {
    if (!id) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setSaving(true);
    setError(null);
    try {
      await act.remove(id);
      onDeleted();
      toast(c.deleted);
      router.back();
    } catch (e) {
      setError(choreErrorText(e, t, 'action'));
      setSaving(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <Card style={{ gap: Spacing.md }}>
        <Input
          label={c.name}
          placeholder={c.namePlaceholder}
          value={name}
          onChangeText={setName}
          maxLength={60}
          autoCapitalize="sentences"
        />
        <FieldLabel>{c.emoji}</FieldLabel>
        <EmojiPicker options={emojiOptions} value={emoji} onChange={setEmoji} labelFor={c.emojiLabel} />
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <FieldLabel hint={existing ? c.rotationHintEdit : c.rotationHint}>{c.rotation}</FieldLabel>
        <RotationPicker
          members={data.members}
          me={data.me}
          meLabel={c.you}
          order={order}
          positionLabel={c.position}
          onPress={(cp) => setOrder((o) => (o.includes(cp) ? o.filter((x) => x !== cp) : [...o, cp]))}
        />
        {order.length > 0 && (
          <View style={styles.orderLine}>
            <AppText variant="callout" style={{ flex: 1 }}>
              {c.order(order.map(who).join(' → '))}
            </AppText>
          </View>
        )}
        {order.length > 0 && (
          <Button variant="plain" label={c.clear} onPress={() => setOrder([])} disabled={saving} />
        )}
      </Card>

      {error && <InlineMessage kind="error" text={error} />}
      <View style={{ gap: Spacing.sm }}>
        <Button label={c.save} onPress={save} loading={saving && !confirmDelete} disabled={saving} />
        {existing && (
          <Button
            variant="secondary"
            label={confirmDelete ? c.confirmDelete : c.delete}
            onPress={remove}
            loading={saving && confirmDelete}
            disabled={saving}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  orderLine: { flexDirection: 'row', alignItems: 'center' },
});
