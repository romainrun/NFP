import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Chip, Dialog, HelperText, Portal, Searchbar, SegmentedButtons, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { ICategoryRepository } from '@/features/products/data/CategoryRepository';
import type { IProductRepository } from '@/features/products/data/ProductRepository';
import type { Product } from '@/features/products/domain/types';
import type { IPromotionRepository } from '@/features/promotions/data/PromotionRepository';
import type { ProductPromotionRule } from '@/features/promotions/domain/types';
import { normalizeDiscountBps } from '@/features/promotions/domain/types';
import { AppHeader } from '@/shared/components/AppHeader';
import { DatePickerField } from '@/shared/components/DatePickerField';
import { Screen } from '@/shared/components/Screen';
import { ProductListSkeleton } from '@/shared/components/skeletons';
import { Colors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import { eurosToCents, formatMoney, parseEurosInput } from '@/shared/utils/money';

const DISCOUNT_PRESETS = [5, 10, 15, 20, 25, 30] as const;

export function PromotionListScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [discountMode, setDiscountMode] = useState<'percent' | 'amount'>('percent');
  const [discountPercent, setDiscountPercent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ['products', 'promotions', search, categoryId],
    queryFn: async () => {
      const repo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
      const result = await repo.list({ search, categoryId, includeInactive: false });
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'promotions-filter'],
    queryFn: async () => {
      const repo = container.resolve<ICategoryRepository>(TOKENS.CategoryRepository);
      const result = await repo.list(false);
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
      const raw = discountPercent.trim().replace(',', '.');
      const percent =
        discountMode === 'percent'
          ? Number(raw)
          : ((eurosToCents(parseEurosInput(raw) ?? Number.NaN) / editing.priceCents) * 100);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        throw new Error('Remise invalide');
      }
      const repo = container.resolve<IPromotionRepository>(TOKENS.PromotionRepository);
      const result = await repo.setRule({
        productId: editing.id,
        discountBps: normalizeDiscountBps(percent * 100),
        isActive,
        startsAt,
        endsAt,
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
    return (
      <Screen padded={false}>
        <ProductListSkeleton />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <AppHeader title="Promotions" subtitle="Remises automatiques par produit" />
      </View>
      <View style={styles.filters}>
        <Searchbar placeholder="Rechercher un produit" value={search} onChangeText={setSearch} />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilterList}
          data={[
            { id: 'all', label: 'Tous', color: Colors.primary },
            ...(categoriesQuery.data ?? []).map((category) => ({
              id: category.id,
              label: category.name,
              color: category.color ?? Colors.primary,
            })),
          ]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoryChips}
          renderItem={({ item }) => {
            const selected = item.id === 'all' ? categoryId === null : categoryId === item.id;
            return (
              <Chip
                compact
                selected={selected}
                onPress={() => setCategoryId(item.id === 'all' ? null : item.id)}
                style={[
                  styles.categoryChip,
                  {
                    borderColor: item.color,
                    backgroundColor: selected ? item.color : 'transparent',
                  },
                ]}
                textStyle={{ color: selected ? Colors.white : item.color }}
              >
                {item.label}
              </Chip>
            );
          }}
        />
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
                  {rule?.startsAt || rule?.endsAt
                    ? ` · ${rule.startsAt ?? 'maintenant'} → ${rule.endsAt ?? 'sans fin'}`
                    : ''}
                </Text>
              </View>
              <Button
                compact
                onPress={() => {
                  setEditing(item);
                  setDiscountMode('percent');
                  setDiscountPercent(rule ? String(rule.discountBps / 100).replace('.', ',') : '');
                  setIsActive(rule?.isActive ?? true);
                  setStartsAt(rule?.startsAt ?? null);
                  setEndsAt(rule?.endsAt ?? null);
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
            <SegmentedButtons
              value={discountMode}
              onValueChange={(value) => setDiscountMode(value as 'percent' | 'amount')}
              buttons={[
                { value: 'percent', label: '%' },
                { value: 'amount', label: '€' },
              ]}
            />
            <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
              Raccourcis fréquents
            </Text>
            <View style={styles.discountPresets}>
              {DISCOUNT_PRESETS.map((preset) => (
                <Chip
                  key={`${discountMode}-${preset}`}
                  compact
                  selected={discountPercent.trim().replace(',', '.') === String(preset)}
                  onPress={() => setDiscountPercent(String(preset))}
                  style={styles.discountPresetChip}
                >
                  {discountMode === 'percent' ? `${preset}%` : `${preset} €`}
                </Chip>
              ))}
            </View>
            <TextInput
              mode="outlined"
              label={discountMode === 'percent' ? 'Remise custom (%)' : 'Remise custom (€)'}
              value={discountPercent}
              onChangeText={setDiscountPercent}
              keyboardType="decimal-pad"
              placeholder="10"
            />
            <View style={styles.switchRow}>
              <Text style={[typography.body, { color: theme.colors.onSurface }]}>Active</Text>
              <Switch value={isActive} onValueChange={setIsActive} color={Colors.primary} />
            </View>
            <View style={styles.dateRow}>
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
            </View>
            <View style={styles.dateActions}>
              <Button compact onPress={() => setStartsAt(null)}>Sans début</Button>
              <Button compact onPress={() => setEndsAt(null)}>Sans fin</Button>
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
  categoryFilterList: { maxHeight: 42, marginTop: spacing.xs },
  categoryChips: { paddingVertical: spacing.xs },
  categoryChip: { marginRight: spacing.xs },
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
  discountPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  discountPresetChip: {
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
});
