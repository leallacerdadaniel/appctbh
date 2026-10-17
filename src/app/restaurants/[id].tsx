import * as Clipboard from 'expo-clipboard';
import { Redirect, useLocalSearchParams } from 'expo-router';
import {
  Award,
  Car,
  Clock,
  Copy,
  Footprints,
  Globe,
  Lightbulb,
  MapPin,
  Navigation,
  Phone,
  Star,
} from 'lucide-react-native';
import { Linking, StyleSheet, View } from 'react-native';

import { PlacePhoto } from '@/components/place-photo';
import { PriceLevel } from '@/components/price-level';
import { Reveal, Screen, SectionLabel } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, PressableScale } from '@/components/ui';
import { Fonts, Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { WALK_LIMIT_MIN, formatDistance, formatRating } from '@/lib/nearby';
import { displayName, getRestaurant, hoursFor, isOpenNow, mapsUrl } from '@/lib/restaurants';

/** Monday first: students plan their week, and it's how Google shows hours too. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

export default function RestaurantScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = getRestaurant(id);

  if (!r) return <Redirect href="/restaurants" />;

  const open = isOpenNow(r);
  const today = new Date().getDay();
  const far = r.walkMin != null && r.walkMin > WALK_LIMIT_MIN;

  return (
    <Screen back title={displayName(r)} subtitle={`${r.cuisine[lang]} · ${r.neighborhood}`}>
      <View style={styles.badges}>
        {r.top100 != null && (
          <View style={[styles.badge, { backgroundColor: theme.brandSoft }]}>
            <Award size={14} color={theme.brand} />
            <AppText variant="caption" color={theme.brand} style={{ fontFamily: Fonts.bodyMedium }}>
              {t.restaurants.top100(r.top100)}
            </AppText>
          </View>
        )}
        <View
          style={[styles.badge, { backgroundColor: theme.surface, borderColor: theme.line, borderWidth: 1 }]}>
          <AppText variant="caption">{t.restaurants.tiers[r.tier]}</AppText>
        </View>
      </View>

      <PlacePhoto placeId={r.placeId} width={1000} aspectRatio={4 / 3} radius={Radius.lg} credit="below" />

      <Reveal index={0}>
        <Card style={styles.facts}>
          {r.rating != null && (
            <Fact label={r.ratingCount ? t.restaurants.reviews(compact(r.ratingCount, lang)) : ''}>
              <View style={styles.inline}>
                <Star size={16} color={theme.text} />
                <AppText style={{ fontFamily: Fonts.bodyMedium }}>
                  {formatRating(r.rating, null, lang)}
                </AppText>
              </View>
            </Fact>
          )}
          {r.priceLevel != null && (
            <Fact label={t.restaurants.priceLevels[r.priceLevel]}>
              <PriceLevel level={r.priceLevel} />
            </Fact>
          )}
          {r.walkMin != null && (
            <Fact label={r.distanceM != null ? formatDistance(r.distanceM, lang) : ''}>
              <View style={styles.inline}>
                {far ? <Car size={16} color={theme.text} /> : <Footprints size={16} color={theme.text} />}
                <AppText style={{ fontFamily: Fonts.bodyMedium }}>
                  {far && r.driveMin != null ? `${r.driveMin} min` : `${r.walkMin} min`}
                </AppText>
              </View>
            </Fact>
          )}
        </Card>
      </Reveal>

      <Reveal index={1}>
        <AppText style={{ lineHeight: 24 }}>{r.description[lang]}</AppText>
      </Reveal>

      <Reveal index={2}>
        <SectionLabel>{t.restaurants.mustTry}</SectionLabel>
      </Reveal>
      <Reveal index={3}>
        <View style={styles.tags}>
          {r.mustTry.map((dish) => (
            <View
              key={dish}
              style={[styles.tag, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <AppText variant="caption" style={{ fontFamily: Fonts.bodyMedium }}>
                {dish}
              </AppText>
            </View>
          ))}
        </View>
      </Reveal>

      <Reveal index={4}>
        <SectionLabel>{t.restaurants.goodFor}</SectionLabel>
      </Reveal>
      <Reveal index={5}>
        <View style={styles.tags}>
          {r.goodFor.map((g) => (
            <View
              key={g}
              style={[styles.tag, { backgroundColor: theme.brandSoft, borderColor: theme.brandSoft }]}>
              <AppText variant="caption" color={theme.brand} style={{ fontFamily: Fonts.bodyMedium }}>
                {t.restaurants.goodForLabels[g]}
              </AppText>
            </View>
          ))}
        </View>
      </Reveal>

      {r.tip && (
        <Reveal index={6}>
          <Card style={styles.tip}>
            <Lightbulb size={20} color={theme.eventCity} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="caption" color={theme.textSecondary}>
                {t.restaurants.tip}
              </AppText>
              <AppText>{r.tip[lang]}</AppText>
            </View>
          </Card>
        </Reveal>
      )}

      <Reveal index={7}>
        <Button
          label={t.restaurants.directions}
          icon={<Navigation size={18} color={theme.onBrand} />}
          onPress={() => Linking.openURL(mapsUrl(r))}
        />
      </Reveal>

      {r.hours.length > 0 && (
        <>
          <Reveal index={8}>
            <View style={styles.sectionHead}>
              <SectionLabel>{t.restaurants.hours}</SectionLabel>
              {open != null && (
                <AppText
                  variant="caption"
                  color={open ? theme.success : theme.textSecondary}
                  style={{ fontFamily: Fonts.bodyMedium, marginTop: Spacing.sm }}>
                  {open ? t.restaurants.openNow : t.restaurants.closedNow}
                </AppText>
              )}
            </View>
          </Reveal>
          <Reveal index={9}>
            <Card style={{ gap: Spacing.sm }}>
              {WEEK.map((day) => {
                const ranges = hoursFor(r, day, lang);
                const isToday = day === today;
                return (
                  <View key={day} style={styles.hoursRow}>
                    <View style={styles.inline}>
                      {isToday && <Clock size={14} color={theme.brand} />}
                      <AppText
                        color={isToday ? theme.brand : theme.text}
                        style={isToday ? { fontFamily: Fonts.bodyMedium } : undefined}>
                        {t.weekdays[day]}
                      </AppText>
                    </View>
                    <AppText
                      color={ranges.length ? (isToday ? theme.brand : theme.text) : theme.textSecondary}
                      style={[
                        { textAlign: 'right', flexShrink: 1 },
                        isToday && { fontFamily: Fonts.bodyMedium },
                      ]}>
                      {ranges.length ? ranges.join(' · ') : t.restaurants.closed}
                    </AppText>
                  </View>
                );
              })}
            </Card>
          </Reveal>
        </>
      )}

      <Reveal index={10}>
        <SectionLabel>{t.restaurants.info}</SectionLabel>
      </Reveal>
      <Reveal index={11}>
        <Card style={{ gap: Spacing.md }}>
          <View style={styles.infoRow}>
            <MapPin size={20} color={theme.textSecondary} />
            <AppText style={{ flex: 1 }}>{r.address}</AppText>
            <IconButton
              label={t.restaurants.copyAddress}
              onPress={async () => {
                await Clipboard.setStringAsync(r.address);
                toast(t.restaurants.addressCopied);
              }}>
              <Copy size={18} color={theme.text} />
            </IconButton>
          </View>
          {r.walkMin != null && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.line }]} />
              <View style={styles.infoRow}>
                <Footprints size={20} color={theme.textSecondary} />
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" color={theme.textSecondary}>
                    {t.restaurants.fromHome}
                  </AppText>
                  <AppText>
                    {t.restaurants.walk(r.walkMin)}
                    {r.driveMin != null && ` · ${t.restaurants.drive(r.driveMin)}`}
                  </AppText>
                </View>
              </View>
            </>
          )}
          {(r.phone || r.website) && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.line }]} />
              <View style={styles.actions}>
                {r.phone && (
                  <View style={{ flex: 1 }}>
                    <Button
                      variant="secondary"
                      label={t.restaurants.call}
                      icon={<Phone size={18} color={theme.text} />}
                      onPress={() => Linking.openURL(`tel:${r.phone!.replace(/\s/g, '')}`)}
                    />
                  </View>
                )}
                {r.website && (
                  <View style={{ flex: 1 }}>
                    <Button
                      variant="secondary"
                      label={t.restaurants.website}
                      icon={<Globe size={18} color={theme.text} />}
                      onPress={() => Linking.openURL(r.website!)}
                    />
                  </View>
                )}
              </View>
            </>
          )}
        </Card>
      </Reveal>

      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.restaurants.source}
      </AppText>
    </Screen>
  );
}

function compact(n: number, lang: 'fr' | 'en') {
  return n.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.fact}>
      {children}
      {!!label && (
        <AppText variant="caption" color={theme.textSecondary}>
          {label}
        </AppText>
      )}
    </View>
  );
}

function IconButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.iconButton, { backgroundColor: theme.background }]}>
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  facts: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: Spacing.md },
  fact: { alignItems: 'center', gap: 2, flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  divider: { height: StyleSheet.hairlineWidth },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  iconButton: {
    width: TapTarget,
    height: TapTarget,
    borderRadius: TapTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
