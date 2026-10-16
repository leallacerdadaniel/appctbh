import { ChevronRight, Globe, KeyRound, LogOut, Mail, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { LanguageSwitch } from '@/components/language-switch';
import { Reveal, Screen } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Avatar, Card, PressableScale } from '@/components/ui';
import { Fonts, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { demoStudent } from '@/lib/mock-data';

export default function ProfileScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { signOut } = useAuth();
  const { t } = useI18n();

  return (
    <Screen title={t.profile.title}>
      <Reveal index={0}>
        <Card style={styles.identity}>
          <Avatar initials={demoStudent.initials} size={56} />
          <View style={{ flex: 1 }}>
            <AppText variant="heading">{demoStudent.fullName}</AppText>
            <AppText variant="caption" color={theme.textSecondary}>
              {demoStudent.email}
            </AppText>
          </View>
        </Card>
      </Reveal>

      <Reveal index={1}>
        <Card style={{ paddingVertical: Spacing.xs }}>
          <View style={styles.item}>
            <Globe size={20} color={theme.text} strokeWidth={1.8} />
            <AppText style={{ flex: 1, fontFamily: Fonts.bodyMedium }}>{t.profile.language}</AppText>
            <LanguageSwitch />
          </View>
          <Divider />
          <Item Icon={KeyRound} label={t.profile.changePassword} onPress={() => toast(t.common.soon)} />
          <Divider />
          <Item Icon={Mail} label={t.profile.contact} onPress={() => toast(t.common.soon)} />
        </Card>
      </Reveal>

      <Reveal index={2}>
        <Card style={{ paddingVertical: Spacing.xs }}>
          <Item Icon={LogOut} label={t.profile.signOut} onPress={signOut} destructive />
        </Card>
      </Reveal>
    </Screen>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.line }} />;
}

function Item({
  Icon,
  label,
  onPress,
  destructive,
}: {
  Icon: LucideIcon;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const theme = useTheme();
  const color = destructive ? theme.error : theme.text;
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} style={styles.item}>
      <Icon size={20} color={color} strokeWidth={1.8} />
      <AppText color={color} style={{ flex: 1, fontFamily: Fonts.bodyMedium }}>
        {label}
      </AppText>
      {!destructive && <ChevronRight size={18} color={theme.textSecondary} />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: TapTarget + 8,
  },
});
