import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  HelperText,
  IconButton,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { ICartRepository } from '@/features/cart/data/CartRepository';
import { useSalesAccess } from '@/features/cart/presentation/hooks/useSalesAccess';
import type { IOrderRepository } from '@/features/checkout/data/OrderRepository';
import type { AppStackParamList } from '@/navigation/types';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay';
import { Screen } from '@/shared/components/Screen';
import { eurosToCents, formatMoney, parseEurosInput } from '@/shared/utils/money';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = NativeStackScreenProps<AppStackParamList, 'Checkout'>;
type TenderMethod = 'cash' | 'card';

export function CheckoutScreen({ navigation }: Props) {
  const theme = useTheme();
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
    if (method === 'card') return totalCents;
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
        <Text style={[typography.h2, { color: theme.colors.onSurface }]}>
          Panier vide
        </Text>
        <Button onPress={() => navigation.goBack()}>Retour caisse</Button>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text style={[typography.h2, { color: theme.colors.onSurface, flex: 1 }]}>
          Encaissement
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.totalCard,
            { backgroundColor: theme.colors.primaryContainer },
          ]}
        >
          <Text style={{ color: theme.colors.onPrimaryContainer }}>À encaisser</Text>
          <Text
            style={[
              typography.brand,
              { color: theme.colors.onPrimaryContainer, fontSize: 40 },
            ]}
          >
            {formatMoney(totalCents)}
          </Text>
          <Text style={{ color: theme.colors.onPrimaryContainer }}>
            {cartQuery.data.itemCount} article
            {cartQuery.data.itemCount > 1 ? 's' : ''}
          </Text>
        </View>

        <Text style={[typography.h3, { color: theme.colors.onSurface }]}>
          Moyen de paiement
        </Text>
        <SegmentedButtons
          value={method}
          onValueChange={(value) => setMethod(value as TenderMethod)}
          buttons={[
            { value: 'cash', label: 'Espèces', icon: 'cash' },
            { value: 'card', label: 'Carte', icon: 'credit-card' },
          ]}
        />

        {method === 'cash' ? (
          <View style={styles.cashBlock}>
            <TextInput
              mode="outlined"
              label="Montant remis (€)"
              value={tendered}
              onChangeText={setTendered}
              keyboardType="decimal-pad"
              placeholder={String(totalCents / 100).replace('.', ',')}
            />
            <View style={styles.quickCash}>
              {[totalCents, 1000, 2000, 5000].map((cents) => (
                <Button
                  key={cents}
                  mode="outlined"
                  compact
                  onPress={() =>
                    setTendered(String(cents / 100).replace('.', ','))
                  }
                >
                  {formatMoney(cents)}
                </Button>
              ))}
            </View>
            <Text style={[typography.h3, { color: theme.colors.primary }]}>
              Monnaie : {formatMoney(changeCents)}
            </Text>
          </View>
        ) : (
          <HelperText type="info" visible>
            Paiement carte simulé hors ligne (prêt pour un TPE réel plus tard).
          </HelperText>
        )}

        {error ? (
          <HelperText type="error" visible>
            {error}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          loading={payMutation.isPending}
          disabled={payMutation.isPending}
          contentStyle={{ minHeight: 56 }}
          onPress={() => {
            setError(null);
            payMutation.mutate();
          }}
        >
          Valider le paiement
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
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
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
