import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, useTheme } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IOrderRepository } from '@/features/checkout/data/OrderRepository';
import { paymentMethodLabel } from '@/features/payments/domain/paymentMethods';
import { Colors } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import { formatMoney } from '@/shared/utils/money';

type Props = {
  orderId: string | null;
  visible: boolean;
  onDismiss: () => void;
};

export function OrderDetailDialog({ orderId, visible, onDismiss }: Props) {
  const theme = useTheme();

  const orderQuery = useQuery({
    queryKey: ['orders', orderId],
    enabled: Boolean(orderId) && visible,
    queryFn: async () => {
      const repo = container.resolve<IOrderRepository>(TOKENS.OrderRepository);
      const result = await repo.getById(orderId!);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        style={[styles.dialog, { backgroundColor: theme.colors.surface }]}
      >
        <Dialog.Title style={typography.h3}>
          {orderQuery.data
            ? `Ticket #${orderQuery.data.receiptNumber}`
            : 'Détail du ticket'}
        </Dialog.Title>
        <Dialog.Content style={{ maxHeight: 420 }}>
          {orderQuery.isLoading || !orderQuery.data ? (
            <Text style={{ color: theme.colors.onSurfaceVariant, paddingVertical: spacing.lg }}>
              Chargement du ticket…
            </Text>
          ) : (
            <ScrollView>
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                {format(new Date(orderQuery.data.createdAt), "EEEE d MMMM yyyy · HH:mm", {
                  locale: fr,
                })}
              </Text>

              <View style={styles.lines}>
                {orderQuery.data.lines.map((line) => (
                  <View key={line.id} style={styles.line}>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>
                        {line.productName}
                      </Text>
                      <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                        {line.quantity} × {formatMoney(line.unitPriceCents)}
                      </Text>
                    </View>
                    <Text style={[typography.money, { color: Colors.primary }]}>
                      {formatMoney(line.lineTotalCents)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={[styles.totals, { backgroundColor: Colors.section }]}>
                <Row label="Sous-total" value={formatMoney(orderQuery.data.subtotalCents)} />
                <Row label="TVA" value={formatMoney(orderQuery.data.vatCents)} />
                <Row label="Total TTC" value={formatMoney(orderQuery.data.totalCents)} strong />
                {orderQuery.data.payments.map((payment) => (
                  <Row
                    key={payment.id}
                    label={paymentMethodLabel(payment.method)}
                    value={formatMoney(payment.amountCents)}
                  />
                ))}
              </View>
            </ScrollView>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} textColor={Colors.primary}>
            Fermer
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
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
  return (
    <View style={styles.row}>
      <Text style={{ color: Colors.text, fontFamily: strong ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>
        {label}
      </Text>
      <Text
        style={{
          color: Colors.text,
          fontFamily: 'Inter_600SemiBold',
          fontSize: strong ? 18 : 15,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dialog: {
    borderRadius: radii.card,
    maxWidth: 520,
    alignSelf: 'center',
    width: '92%',
  },
  lines: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  totals: {
    marginTop: spacing.md,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
