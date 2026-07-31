import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IOrderRepository } from '@/features/checkout/data/OrderRepository';
import type { AppStackParamList } from '@/navigation/types';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay';
import { Screen } from '@/shared/components/Screen';
import { formatMoney } from '@/shared/utils/money';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = NativeStackScreenProps<AppStackParamList, 'OrderDetail'>;

export function OrderDetailScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const { orderId } = route.params;

  const orderQuery = useQuery({
    queryKey: ['orders', orderId],
    queryFn: async () => {
      const repo = container.resolve<IOrderRepository>(TOKENS.OrderRepository);
      const result = await repo.getById(orderId);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  if (orderQuery.isLoading || !orderQuery.data) {
    return <LoadingOverlay label="Chargement du ticket…" />;
  }

  const order = orderQuery.data;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.h2, { color: theme.colors.onSurface }]}>
            Ticket #{order.receiptNumber}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            {format(new Date(order.createdAt), "EEEE d MMMM yyyy · HH:mm", {
              locale: fr,
            })}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
          ]}
        >
          {order.lines.map((line) => (
            <View key={line.id} style={styles.line}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>
                  {line.productName}
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {line.quantity} × {formatMoney(line.unitPriceCents)}
                </Text>
              </View>
              <Text style={[typography.money, { color: theme.colors.primary }]}>
                {formatMoney(line.lineTotalCents)}
              </Text>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.primaryContainer, borderColor: 'transparent' },
          ]}
        >
          <Row label="Sous-total" value={formatMoney(order.subtotalCents)} />
          <Row label="Remise" value={formatMoney(order.discountCents)} />
          <Row label="TVA" value={formatMoney(order.vatCents)} />
          <Row label="Total TTC" value={formatMoney(order.totalCents)} strong />
          {order.payments.map((payment) => (
            <Row
              key={payment.id}
              label={payment.method === 'cash' ? 'Espèces' : 'Carte'}
              value={formatMoney(payment.amountCents)}
            />
          ))}
        </View>

        <Button mode="contained" onPress={() => navigation.navigate('Main', { screen: 'Pos' })}>
          Retour caisse
        </Button>
      </ScrollView>
    </Screen>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text
        style={{
          color: theme.colors.onSurface,
          fontWeight: strong ? '700' : '500',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: theme.colors.onSurface,
          fontWeight: '700',
          fontSize: strong ? 18 : 15,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.sm,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
