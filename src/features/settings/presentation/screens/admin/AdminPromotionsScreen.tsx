import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { format } from 'date-fns';
import {
  Button,
  Chip,
  Dialog,
  HelperText,
  Portal,
  Searchbar,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IProductRepository } from '@/features/products/data/ProductRepository';
import type { IPromotionRepository } from '@/features/promotions/data/PromotionRepository';
import type { PromotionRule } from '@/features/promotions/domain/types';
import { normalizeDiscountBps } from '@/features/promotions/domain/types';
import { AdminScreenShell } from '@/features/settings/presentation/components/AdminScreenShell';
import { DatePickerField } from '@/shared/components/DatePickerField';
import { logSettingsChange } from '@/shared/services/activity/activityTracker';
import { Colors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import { eurosToCents, parseEurosInput } from '@/shared/utils/money';

export function AdminPromotionsScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionRule | null>(null);
  const [kind, setKind] = useState<'percent' | 'fixed_amount'>('percent');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [discountValue, setDiscountValue] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rulesQuery = useQuery({
    queryKey: ['promotions', 'admin-rules'],
    queryFn: async () => {
      const repo = container.resolve<IPromotionRepository>(TOKENS.PromotionRepository);
      const result = await repo.listPromotionRules();
      if (!result.ok) throw result.error;
      return result.value.filter((r) => r.targetType === 'product' && r.productId);
    },
  });

  const productsQuery = useQuery({
    queryKey: ['products', 'admin-promotions'],
    queryFn: async () => {
      const repo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
      const result = await repo.list({ includeInactive: false });
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const productMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of productsQuery.data ?? []) map.set(p.id, p.name);
    return map;
  }, [productsQuery.data]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = productsQuery.data ?? [];
    if (!q) return list.slice(0, 20);
    return list.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 20);
  }, [productsQuery.data, search]);

  const openCreate = () => {
    setEditing(null);
    setKind('percent');
    setSelectedProductIds([]);
    setDiscountValue('');
    setIsActive(true);
    setStartsAt(null);
    setEndsAt(null);
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (rule: PromotionRule) => {
    setEditing(rule);
    setKind(rule.kind);
    setSelectedProductIds(rule.productId ? [rule.productId] : []);
    setDiscountValue(
      rule.kind === 'percent'
        ? String(rule.discountBps / 100)
        : (rule.discountCents / 100).toFixed(2),
    );
    setIsActive(rule.isActive);
    setStartsAt(rule.startsAt);
    setEndsAt(rule.endsAt);
    setError(null);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const repo = container.resolve<IPromotionRepository>(TOKENS.PromotionRepository);
      let discountBps = 0;
      let discountCents = 0;
      if (kind === 'percent') {
        const percent = Number(discountValue.replace(',', '.'));
        if (!Number.isFinite(percent) || percent <= 0) throw new Error('Pourcentage invalide');
        discountBps = normalizeDiscountBps(percent * 100);
      } else {
        discountCents = eurosToCents(parseEurosInput(discountValue) ?? 0);
        if (discountCents <= 0) throw new Error('Montant invalide');
      }

      const productIds = editing?.productId
        ? [editing.productId]
        : selectedProductIds;
      if (productIds.length === 0) throw new Error('Sélectionnez au moins un produit');

      for (const productId of productIds) {
        const rule: PromotionRule = {
          id: editing?.productId === productId ? editing.id : Crypto.randomUUID(),
          kind,
          targetType: 'product',
          productId,
          categoryId: null,
          discountBps,
          discountCents,
          isActive,
          startsAt,
          endsAt,
        };
        const result = await repo.setPromotionRule(rule);
        if (!result.ok) throw result.error;
      }
    },
    onSuccess: async () => {
      setDialogOpen(false);
      await logSettingsChange('Promotions');
      await queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const repo = container.resolve<IPromotionRepository>(TOKENS.PromotionRepository);
      const result = await repo.removePromotionRule(id);
      if (!result.ok) throw result.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
  });

  const labelForRule = (rule: PromotionRule) => {
    const name = productMap.get(rule.productId ?? '') ?? 'Produit';
    const value =
      rule.kind === 'percent'
        ? `${rule.discountBps / 100} %`
        : `${(rule.discountCents / 100).toFixed(2)} €`;
    return `${name} · ${value}`;
  };

  const toggleProduct = (id: string) => {
    if (editing) {
      setSelectedProductIds([id]);
      return;
    }
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <AdminScreenShell title="Promotions" subtitle="Remises sur produits">
      <Button mode="contained" onPress={openCreate} style={{ marginBottom: spacing.sm }}>
        Nouvelle promotion
      </Button>

      <FlatList
        data={rulesQuery.data ?? []}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.row, shadows.sm]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[typography.bodyStrong, { color: Colors.text }]}>
                {labelForRule(item)}
              </Text>
              <Text style={[typography.caption, { color: Colors.textSecondary }]}>
                {item.isActive ? 'Active' : 'Inactive'}
                {item.startsAt ? ` · ${format(new Date(item.startsAt), 'dd/MM/yy')}` : ''}
                {item.endsAt ? ` → ${format(new Date(item.endsAt), 'dd/MM/yy')}` : ''}
              </Text>
            </View>
            <Button compact onPress={() => openEdit(item)}>Modifier</Button>
            <Button compact textColor={Colors.error} onPress={() => removeMutation.mutate(item.id)}>
              Supprimer
            </Button>
          </View>
        )}
        ListEmptyComponent={
          <Text style={[typography.caption, { color: Colors.textSecondary }]}>
            Aucune promotion — ajoutez une remise % ou € sur des produits.
          </Text>
        }
      />

      <Portal>
        <Dialog visible={dialogOpen} onDismiss={() => setDialogOpen(false)}>
          <Dialog.Title>{editing ? 'Modifier la promotion' : 'Nouvelle promotion'}</Dialog.Title>
          <Dialog.Content style={{ gap: spacing.sm }}>
            <SegmentedButtons
              value={kind}
              onValueChange={(v) => setKind(v as 'percent' | 'fixed_amount')}
              buttons={[
                { value: 'percent', label: 'Remise %' },
                { value: 'fixed_amount', label: 'Remise €' },
              ]}
            />
            <TextInput
              mode="outlined"
              label={kind === 'percent' ? 'Remise %' : 'Remise €'}
              value={discountValue}
              onChangeText={setDiscountValue}
              keyboardType="decimal-pad"
            />
            {!editing ? (
              <>
                <Searchbar placeholder="Rechercher un produit" value={search} onChangeText={setSearch} />
                <View style={{ gap: spacing.xxs }}>
                  {filteredProducts.map((p) => (
                    <Chip
                      key={p.id}
                      selected={selectedProductIds.includes(p.id)}
                      onPress={() => toggleProduct(p.id)}
                    >
                      {p.name}
                    </Chip>
                  ))}
                </View>
              </>
            ) : null}
            <DatePickerField
              label="Début"
              value={startsAt ? new Date(`${startsAt}T00:00:00`) : new Date()}
              onChange={(date) => setStartsAt(format(date, 'yyyy-MM-dd'))}
            />
            <DatePickerField
              label="Fin"
              value={endsAt ? new Date(`${endsAt}T00:00:00`) : new Date()}
              onChange={(date) => setEndsAt(format(date, 'yyyy-MM-dd'))}
            />
            <View style={styles.switchRow}>
              <Button compact onPress={() => setStartsAt(null)}>Sans début</Button>
              <Button compact onPress={() => setEndsAt(null)}>Sans fin</Button>
            </View>
            <View style={styles.switchRow}>
              <Text style={typography.body}>Active</Text>
              <Switch value={isActive} onValueChange={setIsActive} />
            </View>
            {error ? (
              <HelperText type="error" visible>{error}</HelperText>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogOpen(false)}>Annuler</Button>
            <Button loading={saveMutation.isPending} onPress={() => saveMutation.mutate()}>
              Enregistrer
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </AdminScreenShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
