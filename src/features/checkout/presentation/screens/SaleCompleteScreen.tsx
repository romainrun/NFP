import { Share, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IOrderRepository } from '@/features/checkout/data/OrderRepository';
import { paymentMethodLabel } from '@/features/payments/domain/paymentMethods';
import type { ISettingsRepository } from '@/features/settings/data/SettingsRepository';
import type { AppStackParamList } from '@/navigation/types';
import { Screen } from '@/shared/components/Screen';
import { ReceiptSkeleton } from '@/shared/components/skeletons';
import { formatMoney } from '@/shared/utils/money';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = NativeStackScreenProps<AppStackParamList, 'SaleComplete'>;

export function SaleCompleteScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const { orderId, changeCents = 0 } = route.params;

  const orderQuery = useQuery({
    queryKey: ['orders', orderId],
    queryFn: async () => {
      const repo = container.resolve<IOrderRepository>(TOKENS.OrderRepository);
      const result = await repo.getById(orderId);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const settingsQuery = useQuery({
    queryKey: ['settings', 'receipt'],
    queryFn: async () => {
      const repo = container.resolve<ISettingsRepository>(TOKENS.SettingsRepository);
      const result = await repo.getSettings();
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  if (orderQuery.isLoading || !orderQuery.data) {
    return (
      <Screen padded={false}>
        <ReceiptSkeleton />
      </Screen>
    );
  }

  const order = orderQuery.data;
  const settings = settingsQuery.data;
  const shareReceipt = async () => {
    const lines = [
      settings?.storeName ?? 'NFP',
      settings?.shopInfo.address ?? '',
      settings?.shopInfo.phone ? `Tél. ${settings.shopInfo.phone}` : '',
      settings?.shopInfo.siret ? `SIRET ${settings.shopInfo.siret}` : '',
      '',
      `Duplicata ticket #${order.receiptNumber}`,
      new Date(order.createdAt).toLocaleString('fr-FR'),
      ...order.lines.map(
        (line) => `${line.quantity} x ${line.productName} — ${formatMoney(line.lineTotalCents)}`,
      ),
      '',
      `Total TTC: ${formatMoney(order.totalCents)}`,
      `TVA: ${formatMoney(order.vatCents)}`,
      ...order.payments.map(
        (payment) => `${paymentMethodLabel(payment.method)}: ${formatMoney(payment.amountCents)}`,
      ),
    ].filter(Boolean);
    await Share.share({ title: `Ticket #${order.receiptNumber}`, message: lines.join('\n') });
  };

  return (
    <Screen centered>
      <Animated.View entering={FadeInDown.duration(380)} style={styles.wrap}>
        <Text style={[typography.brand, { color: theme.colors.primary, fontSize: 36 }]}>
          NFP
        </Text>
        <Text style={[typography.h1, { color: theme.colors.onSurface }]}>
          Vente enregistrée
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>
          Ticket #{order.receiptNumber}
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <Row label="Total TTC" value={formatMoney(order.totalCents)} strong />
          <Row label="dont TVA" value={formatMoney(order.vatCents)} />
          {order.payments.map((payment) => (
            <Row
              key={payment.id}
              label={paymentMethodLabel(payment.method)}
              value={formatMoney(payment.amountCents)}
            />
          ))}
          {changeCents > 0 ? (
            <Row label="Monnaie à rendre" value={formatMoney(changeCents)} highlight />
          ) : null}
        </View>

        <Animated.View entering={FadeInUp.delay(120)} style={styles.actions}>
          <Button
            mode="contained"
            contentStyle={{ minHeight: 52 }}
            onPress={() => navigation.navigate('Main', { screen: 'Pos' })}
          >
            Nouvelle vente
          </Button>
          <Button
            mode="outlined"
            onPress={shareReceipt}
          >
            Partager ticket
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Main', { screen: 'Dashboard' })}
          >
            Tableau de bord
          </Button>
        </Animated.View>
      </Animated.View>
    </Screen>
  );
}

function Row({
  label,
  value,
  strong,
  highlight,
}: {
  label: string;
  value: string;
  strong?: boolean;
  highlight?: boolean;
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
          color: highlight ? theme.colors.primary : theme.colors.onSurface,
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
  wrap: {
    width: '100%',
    maxWidth: 420,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
