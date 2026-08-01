import { Alert, Share, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, useTheme } from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import { hasPermission } from '@/features/authentication/domain/permissions';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import type { IOrderRepository } from '@/features/checkout/data/OrderRepository';
import { paymentMethodLabel } from '@/features/payments/domain/paymentMethods';
import type { ISettingsRepository } from '@/features/settings/data/SettingsRepository';
import { useAdminBundle } from '@/features/settings/presentation/hooks/useAdminBundle';
import { ReceiptSkeleton } from '@/shared/components/skeletons';
import { buildReceiptText } from '@/shared/services/receipt/buildReceiptText';
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
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const canVoid = Boolean(
    session && hasPermission(session.employee.role, 'sales.void'),
  );

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

  const settingsQuery = useQuery({
    queryKey: ['settings', 'receipt'],
    enabled: visible,
    queryFn: async () => {
      const repo = container.resolve<ISettingsRepository>(TOKENS.SettingsRepository);
      const result = await repo.getSettings();
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const adminBundle = useAdminBundle();

  const voidMutation = useMutation({
    mutationFn: async () => {
      if (!orderId || !session) throw new Error('Session invalide');
      const repo = container.resolve<IOrderRepository>(TOKENS.OrderRepository);
      const result = await repo.voidOrder(orderId, session.employee.id);
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['orders', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      onDismiss();
    },
    onError: (error: Error) => Alert.alert('Erreur', error.message),
  });

  const shareReceipt = async () => {
    if (!orderQuery.data) return;
    const order = orderQuery.data;
    const settings = settingsQuery.data;
    const receiptSettings = adminBundle.data?.receipt;
    if (!settings || !receiptSettings) return;
    const lines = buildReceiptText({
      order,
      storeName: settings.storeName,
      shopInfo: settings.shopInfo,
      receipt: receiptSettings,
    });
    await Share.share({ title: `Ticket #${order.receiptNumber}`, message: lines.join('\n') });
  };

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
            <ReceiptSkeleton />
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
          {orderQuery.data ? (
            <Button onPress={shareReceipt} textColor={Colors.primary}>
              Partager
            </Button>
          ) : null}
          {canVoid && orderQuery.data?.status === 'completed' ? (
            <Button
              textColor={theme.colors.error}
              loading={voidMutation.isPending}
              onPress={() =>
                Alert.alert(
                  'Annuler le ticket',
                  'Cette action annule le ticket et remet les articles en stock.',
                  [
                    { text: 'Retour', style: 'cancel' },
                    {
                      text: 'Annuler le ticket',
                      style: 'destructive',
                      onPress: () => voidMutation.mutate(),
                    },
                  ],
                )
              }
            >
              Annuler
            </Button>
          ) : null}
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
