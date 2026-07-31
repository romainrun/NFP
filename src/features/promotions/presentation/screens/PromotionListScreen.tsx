import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Dialog, HelperText, Portal, Searchbar, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IProductRepository } from '@/features/products/data/ProductRepository';
import type { Product } from '@/features/products/domain/types';
import type { IPromotionRepository } from '@/features/promotions/data/PromotionRepository';
import type { ProductPromotionRule } from '@/features/promotions/domain/types';
import { normalizeDiscountBps } from '@/features/promotions/domain/types';
import { AppHeader } from '@/shared/components/AppHeader';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay';
import { Screen } from '@/shared/components/Screen';
import { Colors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import { formatMoney } from '@/shared/utils/money';

export function PromotionListScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [discountPercent, setDiscountPercent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ['products', 'promotions', search],
    queryFn: async () => {
      const repo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
      const result = await repo.list({ search, includeInactive: false });
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const rulesQuery = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const repo = container.resolve<IPromotionRepository>(TOKENS.PromotionRepository);
      const result = await repo.listRules();
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const rulesByProduct = useMemo(() => {
    const map = new Map<string, ProductPromotionRule>();
    for (const rule of rulesQuery.data ?? []) map.set(rule.productId, rule);
    return map;
  }, [rulesQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error('Article invalide');
      const percent = Number(discountPercent.trim().replace(',', '.'));
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        throw new Error('Remise invalide');
      }
      const repo = container.resolve<IPromotionRepository>(TOKENS.PromotionRepository);
      const result = await repo.setRule({
        productId: editing.id,
        discountBps: normalizeDiscountBps(percent * 100),
        isActive,
      });
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: async () => {
      setEditing(null);
      setDiscountPercent('');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['promotions'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  if ((productsQuery.isLoading || rulesQuery.isLoading) && !productsQuery.data) {
    return <LoadingOverlay label="Chargement des promotions…" />;
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <AppHeader title="Promotions" subtitle="Remises automatiques par produit" />
      </View>
      <View style={styles.filters}>
        <Searchbar placeholder="Rechercher un produit" value={search} onChangeText={setSearch} />
      </View>

      <FlatList
        data={productsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const rule = rulesByProduct.get(item.id);
          const percent = rule ? rule.discountBps / 100 : 0;
          return (
            <View style={[styles.row, shadows.sm, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>{item.name}</Text>
                <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                  {formatMoney(item.priceCents)}
                  {rule?.isActive ? ` · Promo -${percent}%` : ''}
                </Text>
              </View>
              <Button
                compact
                onPress={() => {
                  setEditing(item);
                  setDiscountPercent(rule ? String(rule.discountBps / 100).replace('.', ',') : '');
                  setIsActive(rule?.isActive ?? true);
                }}
              >
                Configurer
              </Button>
            </View>
          );
        }}
      />

      <Portal>
        <Dialog visible={Boolean(editing)} onDismiss={() => setEditing(null)}>
          <Dialog.Title>Promotion</Dialog.Title>
          <Dialog.Content style={{ gap: spacing.sm }}>
            <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>
              {editing?.name}
            </Text>
            <TextInput
              mode="outlined"
              label="Remise (%)"
              value={discountPercent}
              onChangeText={setDiscountPercent}
              keyboardType="decimal-pad"
              placeholder="10"
            />
            <View style={styles.switchRow}>
              <Text style={[typography.body, { color: theme.colors.onSurface }]}>Active</Text>
              <Switch value={isActive} onValueChange={setIsActive} color={Colors.primary} />
            </View>
            {error ? <HelperText type="error" visible>{error}</HelperText> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditing(null)}>Annuler</Button>
            <Button loading={saveMutation.isPending} onPress={() => saveMutation.mutate()}>
              Enregistrer
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  filters: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
