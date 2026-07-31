import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  HelperText,
  Searchbar,
  SegmentedButtons,
  Text,
} from 'react-native-paper';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import { OrderDetailDialog } from '@/features/checkout/presentation/components/OrderDetailDialog';
import type { IOrderRepository } from '@/features/checkout/data/OrderRepository';
import type { OrderSummary } from '@/features/checkout/domain/salesHistory';
import { paymentMethodLabel } from '@/features/payments/domain/paymentMethods';
import { AppHeader } from '@/shared/components/AppHeader';
import { DatePickerField } from '@/shared/components/DatePickerField';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay';
import { Screen } from '@/shared/components/Screen';
import { Colors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
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

export function SalesHistoryScreen() {
  const [preset, setPreset] = useState<DayPreset>('today');
  const [fromDate, setFromDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [ticketSearch, setTicketSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const period = useMemo(() => {
    if (preset !== 'range') {
      return buildDayPeriod(presetDay(preset), 0, 24);
    }
    const from = parseDateInput(fromDate) ?? new Date();
    const to = parseDateInput(toDate) ?? from;
    return buildRangePeriod(from, to);
  }, [preset, fromDate, toDate]);

  const historyQuery = useQuery({
    queryKey: ['sales-history', period.fromIso, period.toIso],
    queryFn: async () => {
      const repo = container.resolve<IOrderRepository>(TOKENS.OrderRepository);
      const result = await repo.getSalesHistory(period);
      if (!result.ok) throw result.error;
      return result.value;
    },
    placeholderData: keepPreviousData,
  });

  const snapshot = historyQuery.data;

  const filteredOrders = useMemo(() => {
    const query = ticketSearch.trim().toLowerCase();
    const orders = snapshot?.orders ?? [];
    if (!query) return orders;
    return orders.filter((order) => {
      const haystack = [
        `#${order.receiptNumber}`,
        String(order.receiptNumber),
        formatMoney(order.totalCents),
        ...order.paymentMethods.map(paymentMethodLabel),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [snapshot?.orders, ticketSearch]);

  const maxHourTotal = useMemo(
    () => Math.max(1, ...(snapshot?.hourly.map((h) => h.totalCents) ?? [1])),
    [snapshot?.hourly],
  );

  if (historyQuery.isLoading && !historyQuery.data) {
    return <LoadingOverlay label="Chargement de l’historique…" />;
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.container}>
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
            <DatePickerField
              label="Du"
              value={parseDateInput(fromDate) ?? new Date()}
              onChange={(date) => setFromDate(format(date, 'yyyy-MM-dd'))}
            />
            <DatePickerField
              label="Au"
              value={parseDateInput(toDate) ?? new Date()}
              onChange={(date) => setToDate(format(date, 'yyyy-MM-dd'))}
            />
          </View>
        ) : null}

        <View style={styles.summaryRow}>
          <SummaryTile label="CA TTC" value={formatMoney(snapshot?.totalCents ?? 0)} emphasis />
          <SummaryTile label="Tickets" value={String(snapshot?.orderCount ?? 0)} />
          <SummaryTile
            label="Panier moy."
            value={formatMoney(snapshot?.averageTicketCents ?? 0)}
          />
          <SummaryTile label="TVA" value={formatMoney(snapshot?.vatCents ?? 0)} />
        </View>

        {(snapshot?.paymentBreakdown.length ?? 0) > 0 ? (
          <>
            <Text style={[typography.h3, { color: Colors.text }]}>
              Par moyen de paiement
            </Text>
            <View style={styles.summaryRow}>
              {snapshot?.paymentBreakdown.map((payment) => (
                <SummaryTile
                  key={payment.method}
                  label={`${paymentMethodLabel(payment.method)} · ${payment.orderCount}`}
                  value={formatMoney(payment.totalCents)}
                />
              ))}
            </View>
          </>
        ) : null}

        <Text style={[typography.h3, { color: Colors.text }]}>Par heure</Text>
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
                      backgroundColor: active ? Colors.primary : Colors.section,
                    },
                  ]}
                />
                <Text
                  style={[
                    typography.caption,
                    {
                      color: active ? Colors.text : Colors.textDisabled,
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
          <Text style={[typography.h3, { color: Colors.text }]}>Tickets</Text>
          <Button compact textColor={Colors.primary} onPress={() => void historyQuery.refetch()}>
            Actualiser
          </Button>
        </View>
        <Searchbar
          placeholder="Rechercher ticket, montant, paiement"
          value={ticketSearch}
          onChangeText={setTicketSearch}
          style={styles.ticketSearch}
        />

        {filteredOrders.length === 0 ? (
          <HelperText type="info" visible>
            Aucune vente sur cette période.
          </HelperText>
        ) : (
          filteredOrders.map((item) => (
            <OrderRow
              key={item.id}
              order={item}
              onPress={() => setSelectedOrderId(item.id)}
            />
          ))
        )}
      </ScrollView>

      <OrderDetailDialog
        orderId={selectedOrderId}
        visible={Boolean(selectedOrderId)}
        onDismiss={() => setSelectedOrderId(null)}
      />
    </Screen>
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
  return (
    <View
      style={[
        styles.summaryTile,
        shadows.sm,
        {
          backgroundColor: emphasis ? Colors.primaryLight : Colors.surface,
          borderColor: Colors.border,
        },
      ]}
    >
      <Text style={[typography.caption, { color: Colors.textSecondary }]}>{label}</Text>
      <Text
        style={[
          emphasis ? typography.money : typography.bodyStrong,
          { color: emphasis ? Colors.primaryDark : Colors.text },
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
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.orderRow,
        shadows.sm,
        {
          backgroundColor: Colors.surface,
          borderColor: Colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyStrong, { color: Colors.text }]}>
          Ticket #{order.receiptNumber}
        </Text>
        <Text style={[typography.caption, { color: Colors.textSecondary }]}>
          {format(new Date(order.createdAt), "EEE d MMM · HH:mm", { locale: fr })}
          {' · '}
          {order.itemCount} art.
          {order.paymentMethods.length
            ? ` · ${order.paymentMethods.map(paymentMethodLabel).join(' + ')}`
            : ''}
        </Text>
      </View>
      <Text style={[typography.amount, { color: Colors.primary, fontSize: 18 }]}>
        {formatMoney(order.totalCents)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  segment: { marginBottom: spacing.xs },
  dateRow: { flexDirection: 'row', gap: spacing.sm },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  summaryTile: {
    minWidth: '47%',
    flexGrow: 1,
    borderRadius: radii.card,
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
  hourCol: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '70%', borderRadius: 6, minHeight: 8 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketSearch: {
    elevation: 0,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
});
