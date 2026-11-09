import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bubble, SuggestionPill, TextLink, TypingBubble } from '@/components/assistant-ui';
import { BrandBar } from '@/components/brand-bar';
import { Icon } from '@/components/icon';
import { AppText, Button, Card, PressableScale } from '@/components/ui';
import { MaxContentWidth, Spacing, TapTarget, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import {
  MAX_QUESTION,
  plainAnswer,
  pointsToTeam,
  useAssistant,
  type AssistantError,
  type Exchange,
} from '@/lib/assistant';
import { openWhatsApp } from '@/lib/whatsapp';

/** Errors worth trying again as they are; the others point to the team. */
const RETRYABLE: AssistantError[] = ['busy', 'network', 'server'];
const TO_TEAM: AssistantError[] = ['notConfigured', 'limit', 'noRental'];

/**
 * The assistant: answers from the student's contract, the house rules, the BH guide and their own
 * data in the app. A chat with the composer at the bottom (not a `Screen`: no pull-to-refresh,
 * the input follows the keyboard).
 */
export default function AssistantScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t, lang } = useI18n();
  const a = t.assistant;
  const { exchanges, pending, send, retry, clear } = useAssistant();
  const [text, setText] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const hasChat = exchanges.length > 0;

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  function submit(question: string) {
    if (!question.trim() || pending) return;
    send(question, lang);
    setText('');
  }

  const canSend = !!text.trim() && !pending;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <BrandBar back />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          // Follow the conversation; before it starts, the intro stays at the top.
          onContentSizeChange={() => hasChat && scroll.current?.scrollToEnd({ animated: true })}>
          <View style={styles.column}>
            <View style={{ gap: Spacing.xs }}>
              <AppText variant="display">{a.title}</AppText>
              <AppText color={theme.textSecondary}>{a.subtitle}</AppText>
            </View>

            <Card style={{ gap: Spacing.sm }}>
              <AppText>{a.intro}</AppText>
              <AppText variant="callout" color={theme.textSecondary}>
                {a.caution}
              </AppText>
              <AppText variant="callout" color={theme.textSecondary}>
                {a.privacy}
              </AppText>
            </Card>

            {!hasChat && (
              <View style={{ gap: Spacing.sm }}>
                <AppText variant="callout" color={theme.textSecondary}>
                  {a.examples}
                </AppText>
                <View style={styles.suggestions}>
                  {a.suggestions.map((q) => (
                    <SuggestionPill key={q} label={q} onPress={() => submit(q)} />
                  ))}
                </View>
              </View>
            )}

            {hasChat && (
              <View style={{ gap: Spacing.md }}>
                {exchanges.map((e) => (
                  <ExchangeView key={e.id} exchange={e} onRetry={() => retry(e.id, lang)} />
                ))}
                {!pending && <Button variant="plain" label={a.newChat} onPress={clear} />}
              </View>
            )}
          </View>
        </ScrollView>

        <View
          style={[
            styles.composer,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.line,
              paddingBottom: keyboardOpen ? Spacing.sm : Math.max(insets.bottom, Spacing.sm),
            },
          ]}>
          <View style={styles.composerRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={a.placeholder}
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel={a.placeholder}
              multiline
              maxLength={MAX_QUESTION}
              style={[styles.input, Type.body, { color: theme.text, backgroundColor: theme.fill }]}
            />
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={a.send}
              accessibilityState={{ disabled: !canSend }}
              disabled={!canSend}
              onPress={() => submit(text)}
              style={[styles.send, { backgroundColor: canSend ? theme.text : theme.fill }]}>
              <Icon name="send" size={20} color={canSend ? theme.surface : theme.textTertiary} />
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function ExchangeView({ exchange: e, onRetry }: { exchange: Exchange; onRetry: () => void }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const a = t.assistant;
  const colon = lang === 'fr' ? ' : ' : ': ';
  const team = <TextLink icon="whatsapp" label={a.talkToTeam} onPress={() => openWhatsApp('assistant')} />;

  return (
    <View style={{ gap: Spacing.sm }}>
      <Bubble from="student" accessibilityLabel={`${a.you}${colon}${e.question}`}>
        <AppText>{e.question}</AppText>
      </Bubble>

      {e.status === 'pending' && <TypingBubble label={a.thinking} />}

      {e.status === 'answered' && e.answer && (
        <>
          <Bubble from="assistant">
            <AppText selectable>{plainAnswer(e.answer)}</AppText>
          </Bubble>
          {pointsToTeam(e.answer) && team}
        </>
      )}

      {e.status === 'refused' && (
        <>
          <Bubble from="assistant">
            <AppText>{a.refused}</AppText>
          </Bubble>
          {team}
        </>
      )}

      {e.status === 'error' && (
        <>
          <Bubble from="assistant">
            <View accessibilityRole="alert" style={styles.error}>
              <Icon name="warning" size={18} color={theme.error} />
              {/* flexShrink, not flex: 1 — inside a shrink-wrapped bubble flex: 1 gives the text zero width. */}
              <AppText variant="callout" color={theme.error} style={{ flexShrink: 1 }}>
                {a.errors[e.error ?? 'server']}
              </AppText>
            </View>
          </Bubble>
          {RETRYABLE.includes(e.error ?? 'server') && <TextLink icon="retry" label={a.retry} onPress={onRetry} />}
          {TO_TEAM.includes(e.error ?? 'server') && team}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.gutter,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.sm },
  composerRow: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.gutter - 4,
  },
  input: {
    // No browser outline on web; the field is already on `fill`.
    ...({ outlineStyle: 'none' } as object),
    flex: 1,
    minHeight: TapTarget,
    maxHeight: 132,
    borderRadius: 22,
    paddingHorizontal: Spacing.md,
    paddingTop: 11,
    paddingBottom: 11,
    textAlignVertical: 'top',
  },
  send: {
    width: TapTarget,
    height: TapTarget,
    borderRadius: TapTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
