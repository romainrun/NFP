import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  HelperText,
  IconButton,
  Text,
  TextInput,
} from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { ICartRepository } from '@/features/cart/data/CartRepository';
import { useSalesAccess } from '@/features/cart/presentation/hooks/useSalesAccess';
import type { IOrderRepository } from '@/features/checkout/data/OrderRepository';
import {
  PAYMENT_METHOD_ICONS,
  PAYMENT_METHOD_LABELS,
  TENDER_METHODS,
  isCashMethod,
  type TenderMethod,
} from '@/features/payments/domain/paymentMethods';
import type { AppStackParamList } from '@/navigation/types';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay';
import { Screen } from '@/shared/components/Screen';
import { eurosToCents, formatMoney, parseEurosInput } from '@/shared/utils/money';
import { Colors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = NativeStackScreenProps<AppStackParamList, 'Checkout'>;

export function CheckoutScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const { canSell, userId } = useSalesAccess();
  const [method, setMethod] = useState<TenderMethod>('cash');
  const [tendered, setTendered] = useState('');
  const [error, setError] = useState<string | null>(null);

  const cartQuery = useQuery({
    queryKey: ['cart', userId],
    enabled: Boolean(userId && canSell),
    queryFn: async () => {
      const repo = container.resolve<ICartRepository>(TOKENS.CartRepository);
      const result = await repo.getOrCreateForUser(userId!);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const totalCents = cartQuery.data?.totalCents ?? 0;

  const tenderedCents = useMemo(() => {
    if (!isCashMethod(method)) return totalCents;
    if (!tendered.trim()) return totalCents;
    const euros = parseEurosInput(tendered);
    return euros == null ? null : eurosToCents(euros);
  }, [method, tendered, totalCents]);

  const changeCents =
    tenderedCents != null && tenderedCents >= totalCents
      ? tenderedCents - totalCents
      : 0;

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !cartQuery.data) throw new Error('Session invalide');
      if (tenderedCents == null) throw new Error('Montant remis invalide');
      if (tenderedCents < totalCents) throw new Error('Montant insuffisant');

      const orders = container.resolve<IOrderRepository>(TOKENS.OrderRepository);
      const result = await orders.completeSale({
        cartId: cartQuery.data.id,
        userId,
        payments: [
          {
            method,
            amountCents: totalCents,
            tenderedCents,
          },
        ],
      });
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: async (sale) => {
      await queryClient.invalidateQueries({ queryKey: ['cart', userId] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      navigation.replace('SaleComplete', {
        orderId: sale.order.id,
        changeCents: sale.changeCents,
      });
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!canSell) {
    return (
      <Screen centered>
        <Text>Accès encaissement refusé</Text>
      </Screen>
    );
  }

  if (cartQuery.isLoading || !cartQuery.data) {
    return <LoadingOverlay label="Préparation de l’encaissement…" />;
  }

  if (cartQuery.data.lines.length === 0) {
    return (
      <Screen centered>
        <Text style={[typography.h2, { color: Colors.text }]}>Panier vide</Text>
        <Button onPress={() => navigation.goBack()}>Retour caisse</Button>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text style={[typography.h2, { color: Colors.text, flex: 1 }]}>Encaissement</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.totalCard, shadows.sm]}>
          <Text style={{ color: Colors.primaryDark }}>À encaisser</Text>
          <Text style={[typography.amount, { color: Colors.text }]}>
            {formatMoney(totalCents)}
          </Text>
          <Text style={[typography.caption, { color: Colors.textSecondary }]}>
            {cartQuery.data.itemCount} article
            {cartQuery.data.itemCount > 1 ? 's' : ''}
          </Text>
        </View>

        <Text style={[typography.h3, { color: Colors.text }]}>Moyen de paiement</Text>
        <View style={styles.methodGrid}>
          {TENDER_METHODS.map((value) => {
            const selected = method === value;
            return (
              <Pressable
                key={value}
                onPress={() => setMethod(value)}
                style={[
                  styles.methodTile,
                  shadows.sm,
                  selected && styles.methodTileSelected,
                ]}
              >
                <IconButton
                  icon={PAYMENT_METHOD_ICONS[value]}
                  size={22}
                  iconColor={selected ? Colors.primaryDark : Colors.iconInactive}
                  style={{ margin: 0 }}
                />
                <Text
                  style={[
                    typography.caption,
                    {
                      color: selected ? Colors.primaryDark : Colors.text,
                      textAlign: 'center',
                      fontFamily: selected
                        ? typography.button.fontFamily
                        : typography.caption.fontFamily,
                    },
                  ]}
                >
                  {PAYMENT_METHOD_LABELS[value]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isCashMethod(method) ? (
          <View style={styles.cashBlock}>
            <TextInput
              mode="outlined"
              label="Montant remis (€)"
              value={tendered}
              onChangeText={setTendered}
              keyboardType="decimal-pad"
              placeholder={String(totalCents / 100).replace('.', ',')}
              outlineColor={Colors.border}
              activeOutlineColor={Colors.primary}
              style={{ backgroundColor: Colors.surface }}
            />
            <View style={styles.quickCash}>
              {[totalCents, 1000, 2000, 5000].map((cents) => (
                <Button
                  key={cents}
                  mode="outlined"
                  compact
                  textColor={Colors.primary}
                  style={{ borderColor: Colors.primary }}
                  onPress={() => setTendered(String(cents / 100).replace('.', ','))}
                >
                  {formatMoney(cents)}
                </Button>
              ))}
            </View>
            <Text style={[typography.h3, { color: Colors.primary }]}>
              Monnaie : {formatMoney(changeCents)}
            </Text>
          </View>
        ) : (
          <HelperText type="info" visible>
            {PAYMENT_METHOD_LABELS[method]} — montant exact {formatMoney(totalCents)}{' '}
            (simulation hors ligne).
          </HelperText>
        )}

        {error ? (
          <HelperText type="error" visible>
            {error}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          buttonColor={Colors.primary}
          loading={payMutation.isPending}
          disabled={payMutation.isPending}
          contentStyle={{ minHeight: 56 }}
          labelStyle={typography.button}
          onPress={() => {
            setError(null);
            payMutation.mutate();
          }}
        >
          Valider · {PAYMENT_METHOD_LABELS[method]}
        </Button>
      </ScrollView>
    </Screen>
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
  totalCard: {
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.xs,
    backgroundColor: Colors.primaryLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  methodTile: {
    width: '48%',
    flexGrow: 1,
    minWidth: 140,
    borderRadius: radii.button,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: 2,
  },
  methodTileSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  cashBlock: {
    gap: spacing.sm,
  },
  quickCash: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
