import { router, type Href } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { LanguageSwitch } from '@/components/language-switch';
import { ListGroup, ListRow } from '@/components/list';
import { Screen } from '@/components/screen';
import { AppText, Avatar, Card, PressableScale } from '@/components/ui';
import { Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { useHome } from '@/lib/home';
import { hasContent, useMyProfile } from '@/lib/house-social';
import { contacts } from '@/lib/mock-data';
import { trackAction } from '@/lib/usage';

/** Opened from the round profile button next to the Home greeting. */
export default function ProfileScreen() {
  const theme = useTheme();
  const { signOut } = useAuth();
  const { t } = useI18n();
  const { student } = useHome();
  const { state: social } = useMyProfile();
  const mine = social.status === 'ready' ? social.data.profile : null;
  const p = t.houseSocial.profile;

  return (
    <Screen back title={t.profile.title}>
      <Card style={styles.identity}>
        <Avatar initials={student.initials} size={56} />
        <View style={{ flex: 1 }}>
          <AppText variant="title">{student.fullName}</AppText>
          <AppText variant="callout" color={theme.textSecondary}>
            {student.email}
          </AppText>
        </View>
      </Card>

      <Card style={{ paddingVertical: 0 }}>
        <ListGroup inset>
          <ListRow
            icon="idCard"
            title={p.row}
            subtitle={hasContent(mine) ? (mine.visible ? p.rowVisible : p.rowHidden) : p.rowEmpty}
            onPress={() => router.push('/house/my-profile' as Href)}
          />
          <ListRow icon="website" title={t.profile.language} accessory={<LanguageSwitch />} />
          {/*
            No "Changer le mot de passe" row for now: change-password is only reachable while the
            first-access change is mandatory (Stack.Protected in _layout.tsx) and its server route
            doesn't ask for the current password. Bring it back with a proper flow, never as "Bientôt".
          */}
          <ListRow
            icon="whatsapp"
            title={t.profile.contact}
            subtitle="WhatsApp"
            onPress={() => {
              trackAction('open_whatsapp', 'profile');
              Linking.openURL(`https://wa.me/${contacts.whatsapp}`);
            }}
          />
          <ListRow
            icon="trash"
            title={t.account.rowTitle}
            subtitle={t.account.rowSubtitle}
            onPress={() => router.push('/account-delete' as Href)}
          />
        </ListGroup>
      </Card>

      <Card style={{ paddingVertical: 0 }}>
        <PressableScale accessibilityRole="button" onPress={() => signOut()} style={styles.signOut}>
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
