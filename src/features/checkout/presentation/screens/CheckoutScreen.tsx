import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  HelperText,
  IconButton,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { ICartRepository } from '@/features/cart/data/CartRepository';
import { useSalesAccess } from '@/features/cart/presentation/hooks/useSalesAccess';
import type { IOrderRepository } from '@/features/checkout/data/OrderRepository';
import type { SalePaymentInput } from '@/features/checkout/domain/types';
import {
  PAYMENT_METHOD_ICONS,
  PAYMENT_METHOD_LABELS,
  TENDER_METHODS,
  isCashMethod,
  type TenderMethod,
} from '@/features/payments/domain/paymentMethods';
import { useAdminBundle } from '@/features/settings/presentation/hooks/useAdminBundle';
import type { AppStackParamList } from '@/navigation/types';
import { AnimatedPressable } from '@/shared/components/AnimatedPressable';
import { QueryErrorPanel } from '@/shared/components/QueryErrorPanel';
import { Screen } from '@/shared/components/Screen';
import { CheckoutSkeleton } from '@/shared/components/skeletons';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { vibrateSuccess, vibrateTap } from '@/shared/utils/haptics';
import { trackActivity } from '@/shared/services/activity/activityTracker';
import { eurosToCents, formatMoney, parseEurosInput } from '@/shared/utils/money';
import { Colors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = NativeStackScreenProps<AppStackParamList, 'Checkout'>;
type CheckoutMode = 'single' | 'split';

type SplitLine = {
  id: string;
  method: TenderMethod;
  amount: string;
  reference: string;
};

function needsReference(method: TenderMethod): boolean {
  return method === 'gift_card' || method === 'store_credit';
}

export function CheckoutScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { canSell, userId } = useSalesAccess();
  const { isPhone } = useResponsiveLayout();
  const [mode, setMode] = useState<CheckoutMode>('single');
  const [method, setMethod] = useState<TenderMethod>('cash');
  const [tendered, setTendered] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [splitLines, setSplitLines] = useState<SplitLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const adminBundle = useAdminBundle();

  const enabledMethods = useMemo((): TenderMethod[] => {
    const payments = adminBundle.data?.payments;
    if (!payments) return [...TENDER_METHODS];
    return payments.methods
      .filter((m) => m.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((m) => m.method as TenderMethod);
  }, [adminBundle.data?.payments]);

  const enableSplitPayment = adminBundle.data?.payments.enableSplitPayment ?? true;
  const maxCashCents = adminBundle.data?.payments.maxCashCents ?? 500_000;
  const defaultMethod = (adminBundle.data?.payments.defaultMethod as TenderMethod) ?? 'cash';

  useEffect(() => {
    if (!enabledMethods.length) return;
    if (!enabledMethods.includes(method)) {
      const next: TenderMethod = enabledMethods.includes(defaultMethod)
        ? defaultMethod
        : (enabledMethods[0] ?? 'cash');
      setMethod(next);
    }
  }, [enabledMethods, defaultMethod, method]);

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

  const splitAllocatedCents = useMemo(() => {
    return splitLines.reduce((sum, line) => {
      const euros = parseEurosInput(line.amount);
      if (euros == null) return sum;
      return sum + eurosToCents(euros);
    }, 0);
  }, [splitLines]);

  const splitRemainingCents = totalCents - splitAllocatedCents;

  const changeCents =
    mode === 'single' && tenderedCents != null && tenderedCents >= totalCents
      ? tenderedCents - totalCents
      : 0;

  const buildPayments = (): SalePaymentInput[] => {
    if (mode === 'single') {
      if (tenderedCents == null) throw new Error('Montant remis invalide');
      if (isCashMethod(method) && tenderedCents < totalCents) {
        throw new Error('Montant insuffisant');
      }
      if (isCashMethod(method) && tenderedCents > maxCashCents) {
        throw new Error(`Espèces max : ${formatMoney(maxCashCents)}`);
      }
      if (needsReference(method) && !paymentReference.trim()) {
        throw new Error('Référence requise pour ce moyen de paiement');
      }
      return [
        {
          method,
          amountCents: totalCents,
          tenderedCents: isCashMethod(method) ? tenderedCents : totalCents,
          reference: needsReference(method) ? paymentReference.trim() : null,
        },
      ];
    }

    if (splitLines.length === 0) throw new Error('Ajoutez au moins un paiement');
    if (splitRemainingCents > 0) {
      throw new Error(`Il reste ${formatMoney(splitRemainingCents)} à encaisser`);
    }

    const payments: SalePaymentInput[] = [];
    let cashTendered = 0;
    for (const line of splitLines) {
      const euros = parseEurosInput(line.amount);
      if (euros == null || euros <= 0) throw new Error('Montant de ligne invalide');
      const cents = eurosToCents(euros);
      if (needsReference(line.method) && !line.reference.trim()) {
        throw new Error(`Référence requise pour ${PAYMENT_METHOD_LABELS[line.method]}`);
      }
      if (isCashMethod(line.method)) cashTendered += cents;
      payments.push({
        method: line.method,
        amountCents: cents,
        tenderedCents: isCashMethod(line.method) ? cents : cents,
        reference: needsReference(line.method) ? line.reference.trim() : null,
      });
    }
    return payments;
  };

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !cartQuery.data) throw new Error('Session invalide');
      const payments = buildPayments();
      const orders = container.resolve<IOrderRepository>(TOKENS.OrderRepository);
      const result = await orders.completeSale({
        cartId: cartQuery.data.id,
        userId,
        payments,
      });
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: async (sale) => {
      vibrateSuccess();
      await trackActivity(userId);
      await queryClient.invalidateQueries({ queryKey: ['cart', userId] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      await queryClient.invalidateQueries({ queryKey: ['sync'] });
      navigation.replace('SaleComplete', {
        orderId: sale.order.id,
        changeCents: sale.changeCents,
      });
    },
    onError: (err: Error) => setError(err.message),
  });

  const addSplitLine = () => {
    const remaining = Math.max(0, splitRemainingCents);
    setSplitLines((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        method: 'card',
        amount: String((remaining / 100).toFixed(2)).replace('.', ','),
        reference: '',
      },
    ]);
  };

  if (!canSell) {
    return (
      <Screen centered>
        <Text>Accès encaissement refusé</Text>
      </Screen>
    );
  }

  if (cartQuery.isError) {
    return (
      <QueryErrorPanel
        message={cartQuery.error?.message}
        onRetry={() => void cartQuery.refetch()}
      />
    );
  }

  if (cartQuery.isLoading && !cartQuery.data) {
    return (
      <Screen padded={false}>
        <CheckoutSkeleton />
      </Screen>
    );
  }

  if (!cartQuery.data || cartQuery.data.lines.length === 0) {
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

      <ScrollView
        contentContainerStyle={[
          styles.content,
          isPhone && { paddingBottom: spacing.xxl + insets.bottom },
        ]}
      >
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

        <SegmentedButtons
          value={mode}
          onValueChange={(value) => {
            if (value === 'split' && !enableSplitPayment) return;
            setMode(value as CheckoutMode);
            setError(null);
          }}
          buttons={[
            { value: 'single', label: 'Simple' },
            { value: 'split', label: 'Mixte', disabled: !enableSplitPayment },
          ]}
        />

        {mode === 'single' ? (
          <>
            <Text style={[typography.h3, { color: Colors.text }]}>Moyen de paiement</Text>
            <View style={styles.methodGrid}>
              {enabledMethods.map((value) => {
                const selected = method === value;
                return (
                  <AnimatedPressable
                    key={value}
                    onPress={() => {
                      vibrateTap();
                      setMethod(value);
                    }}
                    style={[
                      styles.methodTile,
                      isPhone && styles.methodTilePhone,
                      shadows.sm,
                      selected && styles.methodTileSelected,
                    ]}
                    scaleTo={0.975}
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
                  </AnimatedPressable>
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
            ) : needsReference(method) ? (
              <TextInput
                mode="outlined"
                label="Référence avoir / carte cadeau"
                value={paymentReference}
                onChangeText={setPaymentReference}
                autoCapitalize="characters"
                style={{ backgroundColor: Colors.surface }}
              />
            ) : (
              <HelperText type="info" visible>
                {PAYMENT_METHOD_LABELS[method]} — {formatMoney(totalCents)} (simulation hors ligne)
              </HelperText>
            )}
          </>
        ) : (
          <View style={styles.splitBlock}>
            <Text style={[typography.bodyStrong, { color: Colors.text }]}>
              Reste à encaisser : {formatMoney(Math.max(0, splitRemainingCents))}
            </Text>
            {splitLines.map((line) => (
              <View key={line.id} style={styles.splitRow}>
                <View style={styles.splitMethodRow}>
                  {enabledMethods.map((m) => (
                    <Button
                      key={m}
                      compact
                      mode={line.method === m ? 'contained' : 'outlined'}
                      onPress={() =>
                        setSplitLines((prev) =>
                          prev.map((item) =>
                            item.id === line.id ? { ...item, method: m } : item,
                          ),
                        )
                      }
                    >
                      {PAYMENT_METHOD_LABELS[m]}
                    </Button>
                  ))}
                </View>
                <TextInput
                  mode="outlined"
                  label="Montant (€)"
                  value={line.amount}
                  onChangeText={(value) =>
                    setSplitLines((prev) =>
                      prev.map((item) => (item.id === line.id ? { ...item, amount: value } : item)),
                    )
                  }
                  keyboardType="decimal-pad"
                />
                {needsReference(line.method) ? (
                  <TextInput
                    mode="outlined"
                    label="Référence"
                    value={line.reference}
                    onChangeText={(value) =>
                      setSplitLines((prev) =>
                        prev.map((item) =>
                          item.id === line.id ? { ...item, reference: value } : item,
                        ),
                      )
                    }
                  />
                ) : null}
                <Button
                  compact
                  textColor={Colors.error}
                  onPress={() => setSplitLines((prev) => prev.filter((item) => item.id !== line.id))}
                >
                  Retirer
                </Button>
              </View>
            ))}
            <Button mode="outlined" onPress={addSplitLine}>Ajouter un paiement</Button>
          </View>
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
          contentStyle={{ minHeight: isPhone ? 56 : 52 }}
          labelStyle={typography.button}
          style={isPhone ? styles.payButtonPhone : undefined}
          onPress={() => {
            setError(null);
            vibrateTap();
            payMutation.mutate();
          }}
        >
          {mode === 'split' ? 'Valider paiement mixte' : `Valider · ${PAYMENT_METHOD_LABELS[method]}`}
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
  methodTilePhone: {
    minWidth: '30%',
    width: '31%',
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
  splitBlock: {
    gap: spacing.sm,
  },
  splitRow: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: radii.md,
  },
  splitMethodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
  },
  payButtonPhone: {
    marginTop: spacing.sm,
  },
});
