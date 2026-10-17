import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { LanguageSwitch } from '@/components/language-switch';
import { ListGroup, ListRow } from '@/components/list';
import { Screen } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Avatar, Card, PressableScale } from '@/components/ui';
import { Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { demoStudent } from '@/lib/mock-data';

/** Opened from the initials next to the Home greeting (the tab went to "Voyages"). */
export default function ProfileScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { signOut } = useAuth();
  const { t } = useI18n();

  return (
    <Screen back title={t.profile.title}>
      <Card style={styles.identity}>
        <Avatar initials={demoStudent.initials} size={56} />
        <View style={{ flex: 1 }}>
          <AppText variant="title">{demoStudent.fullName}</AppText>
          <AppText variant="callout" color={theme.textSecondary}>
            {demoStudent.email}
          </AppText>
        </View>
      </Card>

      <Card style={{ paddingVertical: 0 }}>
        <ListGroup inset>
          <ListRow icon="website" title={t.profile.language} accessory={<LanguageSwitch />} />
          <ListRow icon="key" title={t.profile.changePassword} onPress={() => toast(t.common.soon)} />
          <ListRow icon="mail" title={t.profile.contact} onPress={() => toast(t.common.soon)} />
        </ListGroup>
      </Card>

      <Card style={{ paddingVertical: 0 }}>
        <PressableScale accessibilityRole="button" onPress={signOut} style={styles.signOut}>
          <Icon name="signOut" size={20} color={theme.error} />
          <AppText color={theme.error}>{t.profile.signOut}</AppText>
        </PressableScale>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  signOut: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: TapTarget + 12 },
});
