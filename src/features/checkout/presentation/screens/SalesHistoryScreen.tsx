import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import {
  Button,
  Chip,
  HelperText,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IOrderRepository } from '@/features/checkout/data/OrderRepository';
import type { OrderSummary } from '@/features/checkout/domain/salesHistory';
import type { AppStackParamList } from '@/navigation/types';
import { AppHeader } from '@/shared/components/AppHeader';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay';
import { Screen } from '@/shared/components/Screen';
import { formatMoney } from '@/shared/utils/money';
import {
  buildDayPeriod,
  buildRangePeriod,
  formatHourLabel,
  formatPeriodLabel,
  parseDateInput,
  presetDay,
  type DayPreset,
} from '@/shared/utils/salesPeriod';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

const HOURS = Array.from({ length: 25 }, (_, i) => i); // 0..24

export function SalesHistoryScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [preset, setPreset] = useState<DayPreset>('today');
  const [startHour, setStartHour] = useState(0);
  const [endHour, setEndHour] = useState(24);
  const [fromDate, setFromDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const period = useMemo(() => {
    if (preset === 'range') {
      const from = parseDateInput(fromDate) ?? new Date();
      const to = parseDateInput(toDate) ?? from;
      return buildRangePeriod(from, to, startHour, endHour);
    }
    return buildDayPeriod(presetDay(preset), startHour, endHour);
  }, [preset, startHour, endHour, fromDate, toDate]);

  const historyQuery = useQuery({
    queryKey: ['sales-history', period.fromIso, period.toIso],
    queryFn: async () => {
      const repo = container.resolve<IOrderRepository>(TOKENS.OrderRepository);
      const result = await repo.getSalesHistory(period);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  if (historyQuery.isLoading && !historyQuery.data) {
    return <LoadingOverlay label="Chargement de l’historique…" />;
  }

  const snapshot = historyQuery.data;
  const maxHourTotal = Math.max(
    1,
    ...(snapshot?.hourly.map((h) => h.totalCents) ?? [1]),
  );

  return (
    <Screen padded={false}>
      <View style={styles.container}>
        <AppHeader
          title="Historique des ventes"
          subtitle={formatPeriodLabel(period.fromIso, period.toIso)}
        />

        <SegmentedButtons
          value={preset}
          onValueChange={(value) => setPreset(value as DayPreset)}
          buttons={[
            { value: 'today', label: 'Aujourd’hui' },
            { value: 'yesterday', label: 'Hier' },
            { value: 'range', label: 'Plage' },
          ]}
          style={styles.segment}
        />

        {preset === 'range' ? (
          <View style={styles.dateRow}>
            <TextInput
              mode="outlined"
              dense
              label="Du (AAAA-MM-JJ)"
              value={fromDate}
              onChangeText={setFromDate}
              style={{ flex: 1 }}
            />
            <TextInput
              mode="outlined"
              dense
              label="Au (AAAA-MM-JJ)"
              value={toDate}
              onChangeText={setToDate}
              style={{ flex: 1 }}
            />
          </View>
        ) : null}

        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
          Horaires (défaut 00h → minuit)
        </Text>
        <View style={styles.hourRow}>
          <HourChips
            label="Début"
            value={startHour}
            options={HOURS.filter((h) => h < 24)}
            onChange={setStartHour}
          />
          <HourChips
            label="Fin"
            value={endHour}
            options={HOURS}
            onChange={setEndHour}
          />
        </View>

        <View style={styles.summaryRow}>
          <SummaryTile
            label="CA TTC"
            value={formatMoney(snapshot?.totalCents ?? 0)}
            emphasis
          />
          <SummaryTile
            label="Tickets"
            value={String(snapshot?.orderCount ?? 0)}
          />
          <SummaryTile
            label="Panier moy."
            value={formatMoney(snapshot?.averageTicketCents ?? 0)}
          />
          <SummaryTile
            label="TVA"
            value={formatMoney(snapshot?.vatCents ?? 0)}
          />
        </View>

        <Text style={[typography.h3, { color: theme.colors.onSurface }]}>
          Par heure
        </Text>
        <View style={styles.hourlyWrap}>
          {(snapshot?.hourly ?? []).map((bucket) => {
            const height = 8 + (bucket.totalCents / maxHourTotal) * 72;
            const active = bucket.orderCount > 0;
            return (
              <View key={bucket.hour} style={styles.hourCol}>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: active
                        ? theme.colors.primary
                        : theme.colors.surfaceVariant,
                    },
                  ]}
                />
                <Text
                  style={[
                    typography.caption,
                    {
                      color: active
                        ? theme.colors.onSurface
                        : theme.colors.onSurfaceVariant,
                      fontSize: 10,
                    },
                  ]}
                >
                  {formatHourLabel(bucket.hour)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.listHeader}>
          <Text style={[typography.h3, { color: theme.colors.onSurface }]}>
            Tickets
          </Text>
          <Button compact onPress={() => void historyQuery.refetch()}>
            Actualiser
          </Button>
        </View>

        <FlatList
          data={snapshot?.orders ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          ListEmptyComponent={
            <HelperText type="info" visible>
              Aucune vente sur cette période.
            </HelperText>
          }
          renderItem={({ item }) => (
            <OrderRow
              order={item}
              onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
            />
          )}
        />
      </View>
    </Screen>
  );
}

function HourChips({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (value: number) => void;
}) {
  return (
    <View style={{ flex: 1, gap: spacing.xxs }}>
      <Text style={typography.caption}>
        {label}: {value >= 24 ? '24h' : formatHourLabel(value)}
      </Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={options}
        keyExtractor={(item) => `${label}-${item}`}
        renderItem={({ item }) => (
          <Chip
            selected={item === value}
            onPress={() => onChange(item)}
            style={{ marginRight: spacing.xxs }}
            compact
          >
            {item >= 24 ? '24h' : formatHourLabel(item)}
          </Chip>
        )}
      />
    </View>
  );
}

function SummaryTile({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.summaryTile,
        {
          backgroundColor: emphasis
            ? theme.colors.primaryContainer
            : theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}
    >
      <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text
        style={[
          typography.bodyStrong,
          { color: emphasis ? theme.colors.primary : theme.colors.onSurface },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function OrderRow({
  order,
  onPress,
}: {
  order: OrderSummary;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.orderRow,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>
          Ticket #{order.receiptNumber}
        </Text>
        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
          {format(new Date(order.createdAt), "EEE d MMM · HH:mm", { locale: fr })}
          {' · '}
          {order.itemCount} art.
          {order.paymentMethods.length
            ? ` · ${order.paymentMethods.join('+')}`
            : ''}
        </Text>
      </View>
      <Text style={[typography.money, { color: theme.colors.primary }]}>
        {formatMoney(order.totalCents)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  segment: {
    marginBottom: spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  hourRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  summaryTile: {
    minWidth: '47%',
    flexGrow: 1,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm,
    gap: 2,
  },
  hourlyWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    minHeight: 100,
    paddingVertical: spacing.xs,
  },
  hourCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  bar: {
    width: '70%',
    borderRadius: 6,
    minHeight: 8,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
});
