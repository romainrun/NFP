import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Dialog, HelperText, Portal, Searchbar, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IProductRepository } from '@/features/products/data/ProductRepository';
import type { Product, StockAdjustmentType } from '@/features/products/domain/types';
import { useCatalogAccess } from '@/features/products/presentation/hooks/useCatalogAccess';
import { AppHeader } from '@/shared/components/AppHeader';
import { Screen } from '@/shared/components/Screen';
import { ProductListSkeleton } from '@/shared/components/skeletons';
import { Colors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

export function InventoryScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { canManage, userId } = useCatalogAccess();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [mode, setMode] = useState<StockAdjustmentType>('in');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ['products', 'inventory', search],
    queryFn: async () => {
      const repo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
      const result = await repo.list({ search, includeInactive: false });
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!editing || !userId || !canManage) throw new Error('Permission refusée');
      const qty = Number(quantity.replace(',', '.'));
      if (!Number.isFinite(qty) || qty <= 0) throw new Error('Quantité invalide');
      const repo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
      const result = await repo.adjustStock({
        productId: editing.id,
        userId,
        type: mode,
        quantity: qty,
        reason: reason.trim() || null,
      });
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: async () => {
      setEditing(null);
      setQuantity('');
      setReason('');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  if (productsQuery.isLoading && !productsQuery.data) {
    return (
      <Screen padded={false}>
        <ProductListSkeleton count={5} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <AppHeader title="Inventaire" subtitle="Recherche et ajustement du stock" />
      </View>
      <View style={styles.filters}>
        <Searchbar placeholder="Nom, SKU ou code-barres" value={search} onChangeText={setSearch} />
      </View>
      <FlatList
        data={productsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={productsQuery.isRefetching}
        onRefresh={() => void productsQuery.refetch()}
        renderItem={({ item }) => (
          <View style={[styles.row, shadows.sm, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>{item.name}</Text>
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                {item.sku} · Stock {item.stockQuantity}
              </Text>
            </View>
            <Button compact disabled={!canManage} onPress={() => setEditing(item)}>
              Ajuster
            </Button>
          </View>
        )}
      />

      <Portal>
        <Dialog visible={Boolean(editing)} onDismiss={() => setEditing(null)}>
          <Dialog.Title>Ajuster le stock</Dialog.Title>
          <Dialog.Content style={{ gap: spacing.sm }}>
            <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>
              {editing?.name}
            </Text>
            <SegmentedButtons
              value={mode}
              onValueChange={(value) => setMode(value as StockAdjustmentType)}
              buttons={[
                { value: 'in', label: 'Entrée' },
                { value: 'out', label: 'Sortie' },
                { value: 'adjustment', label: 'Correction' },
              ]}
            />
            <TextInput mode="outlined" label="Quantité" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
            <TextInput mode="outlined" label="Motif" value={reason} onChangeText={setReason} />
            {error ? <HelperText type="error" visible>{error}</HelperText> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditing(null)}>Annuler</Button>
            <Button loading={adjustMutation.isPending} onPress={() => adjustMutation.mutate()}>
              Valider
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
});
