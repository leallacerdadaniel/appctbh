import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import {
  CalendarDays,
  MapPin,
  MessageCircle,
  Search,
  ShieldAlert,
  Sparkles,
  Wallet,
  Wifi,
  type LucideIcon,
} from 'lucide-react-native';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Reveal, Screen, SectionLabel } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Avatar, Card, PressableScale } from '@/components/ui';
import { Brand, Fonts, MaxContentWidth, Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatBrl, formatDate, formatShortDate, formatTime } from '@/lib/format';
import {
  contacts,
  demoApartment,
  demoContract,
  demoNext,
  demoRoommates,
  demoStudent,
} from '@/lib/mock-data';

export default function HomeScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();

  async function copyWifi() {
    await Clipboard.setStringAsync(demoApartment.wifiPassword);
    toast(t.home.wifiCopied);
  }

  const { cleaning, payment } = demoNext;

  return (
    <Screen header={<Header />}>
      <Reveal index={0}>
        <PressableScale
          accessibilityRole="search"
          onPress={() => router.navigate({ pathname: '/guide', params: { focus: '1' } })}
          style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Search size={18} color={theme.textSecondary} />
          <AppText color={theme.textSecondary}>{t.home.searchPlaceholder}</AppText>
        </PressableScale>
      </Reveal>

      <Reveal index={1}>
        <SectionLabel>{t.home.upcoming}</SectionLabel>
      </Reveal>
      <Reveal index={2}>
        <View style={styles.row}>
          <UpcomingCard
            Icon={Sparkles}
            label={t.home.cleaning}
            value={`${t.weekdays[cleaning.weekday]} · ${formatTime(cleaning.time, lang)}`}
          />
          <UpcomingCard
            Icon={Wallet}
            label={t.home.rentOf(t.months[payment.month])}
            value={`${formatBrl(payment.amountBrl, lang)} · ${formatShortDate(payment.dueDate, lang)}`}
          />
        </View>
      </Reveal>

      <Reveal index={3}>
        <SectionLabel>{t.home.shortcuts}</SectionLabel>
      </Reveal>
      <Reveal index={4}>
        <View style={styles.grid}>
          <QuickAction Icon={Wifi} label={t.home.wifi} hint={t.home.copy} onPress={copyWifi} />
          <QuickAction
            Icon={MapPin}
            label={t.home.address}
            hint={t.home.open}
            onPress={() =>
              Linking.openURL(
                `https://maps.google.com/?q=${encodeURIComponent(demoApartment.mapsQuery)}`,
              )
            }
          />
          <QuickAction
            Icon={MessageCircle}
            label="Chez Toi"
            hint="WhatsApp"
            onPress={() => Linking.openURL(`https://wa.me/${contacts.whatsapp}`)}
          />
          <QuickAction
            Icon={ShieldAlert}
            label={t.home.emergency}
            hint={t.home.numbers}
            onPress={() =>
              router.navigate({ pathname: '/guide', params: { q: t.guide.emergencyQuery } })
            }
          />
        </View>
      </Reveal>

      <Reveal index={5}>
        <SectionLabel>{t.home.roommates}</SectionLabel>
      </Reveal>
      <Reveal index={6}>
        <Card style={{ gap: Spacing.md }}>
          {demoRoommates.map((r) => (
            <View key={r.name} style={styles.person}>
              <Avatar initials={r.initials} />
              <AppText>{r.name}</AppText>
            </View>
          ))}
        </Card>
      </Reveal>

      <Reveal index={7}>
        <Card style={styles.contract}>
          <CalendarDays size={20} color={theme.textSecondary} />
          <View style={{ flex: 1 }}>
            <AppText variant="caption" color={theme.textSecondary}>
              {t.home.contract(demoContract.semester)}
            </AppText>
            <AppText>
              {formatDate(demoContract.moveIn, lang)} → {formatDate(demoContract.moveOut, lang)}
            </AppText>
          </View>
        </Card>
      </Reveal>
    </Screen>
  );
}

function Header() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const greeting = new Date().getHours() < 18 ? t.home.morning : t.home.evening;

  return (
    <View style={{ backgroundColor: Brand.red }}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <AppText
          variant="caption"
          color="rgba(255,255,255,0.85)"
          style={{ fontFamily: Fonts.displayBold, letterSpacing: 2 }}>
          CHEZ TOI BH
        </AppText>
        <Animated.View entering={FadeIn.duration(500)} style={{ gap: Spacing.xs }}>
          <AppText variant="title" color={theme.onBrand}>
            {greeting}, {demoStudent.firstName} 👋
          </AppText>
          <AppText color="rgba(255,255,255,0.85)">
            {demoApartment.nickname} · {demoApartment.neighborhood}
          </AppText>
        </Animated.View>
      </View>
    </View>
  );
}

function UpcomingCard({ Icon, label, value }: { Icon: LucideIcon; label: string; value: string }) {
  const theme = useTheme();
  return (
    <Card style={{ flex: 1, gap: Spacing.sm }}>
      <View style={[styles.iconBubble, { backgroundColor: theme.brandSoft }]}>
        <Icon size={18} color={theme.brand} />
      </View>
      <AppText variant="caption" color={theme.textSecondary}>
        {label}
      </AppText>
      <AppText style={{ fontFamily: Fonts.bodySemiBold }}>{value}</AppText>
    </Card>
  );
}

function QuickAction({
  Icon,
  label,
  hint,
  onPress,
}: {
  Icon: LucideIcon;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${hint}`}
      onPress={onPress}
      style={[styles.quick, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <Icon size={22} color={theme.text} strokeWidth={1.8} />
      <View>
        <AppText style={{ fontFamily: Fonts.bodySemiBold }}>{label}</AppText>
        <AppText variant="caption" color={theme.textSecondary}>
          {hint}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: TapTarget + 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  row: { flexDirection: 'row', gap: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  quick: {
    flexBasis: '48%',
    flexGrow: 1,
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  person: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  contract: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
