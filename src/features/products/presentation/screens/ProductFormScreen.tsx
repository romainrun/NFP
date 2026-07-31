import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  HelperText,
  IconButton,
  Menu,
  Portal,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { ICategoryRepository } from '@/features/products/data/CategoryRepository';
import type { IProductRepository } from '@/features/products/data/ProductRepository';
import { deleteProductImageIfOwned } from '@/features/products/data/productImageStorage';
import { VAT_RATES } from '@/features/products/domain/types';
import { ProductImageField } from '@/features/products/presentation/components/ProductImageField';
import { useCatalogAccess } from '@/features/products/presentation/hooks/useCatalogAccess';
import type { AppStackParamList } from '@/navigation/types';
import { Screen } from '@/shared/components/Screen';
import { ProductFormSkeleton } from '@/shared/components/skeletons';
import { centsToEuros, eurosToCents, formatMoney, parseEurosInput } from '@/shared/utils/money';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = NativeStackScreenProps<AppStackParamList, 'ProductForm'>;

const schema = z.object({
  name: z.string().trim().min(1, 'Nom requis'),
  sku: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  description: z.string().trim().optional(),
  categoryId: z.string().nullable().optional(),
  priceEuros: z
    .string()
    .trim()
    .min(1, 'Prix requis')
    .refine((v) => parseEurosInput(v) !== null, 'Prix invalide'),
  vatRate: z.number().min(0).max(100),
  costEuros: z.string().trim().optional(),
  stockQuantity: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v.replace(',', '.'))) && Number(v.replace(',', '.')) >= 0), 'Stock invalide'),
  isFavorite: z.boolean(),
  isQuick: z.boolean(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function ProductFormScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { canManage, userId } = useCatalogAccess();
  const productId = route.params.productId;
  const initialBarcode = route.params.initialBarcode;
  const isEdit = Boolean(productId);

  const [vatMenuOpen, setVatMenuOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockDelta, setStockDelta] = useState('');
  const [stockReason, setStockReason] = useState('');
  const [stockMode, setStockMode] = useState<'in' | 'out' | 'adjustment'>('in');
  const [formError, setFormError] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const productQuery = useQuery({
    queryKey: ['products', productId],
    enabled: Boolean(productId),
    queryFn: async () => {
      const repo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
      const result = await repo.getById(productId!);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: async () => {
      const repo = container.resolve<ICategoryRepository>(TOKENS.CategoryRepository);
      const result = await repo.list(false);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const salesStatsQuery = useQuery({
    queryKey: ['products', productId, 'sales-stats'],
    enabled: Boolean(productId),
    queryFn: async () => {
      const repo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
      const result = await repo.getSalesStats(productId!);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const defaults = useMemo<FormValues>(
    () => ({
      name: '',
      sku: '',
      barcode: initialBarcode ?? '',
      description: '',
      categoryId: null,
      priceEuros: '',
      vatRate: 5.5,
      costEuros: '',
      stockQuantity: '0',
      isFavorite: false,
      isQuick: false,
      isActive: true,
    }),
    [initialBarcode],
  );

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (!productQuery.data) return;
    const p = productQuery.data;
    setImageUri(p.imageUri);
    reset({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode ?? '',
      description: p.description ?? '',
      categoryId: p.categoryId,
      priceEuros: String(centsToEuros(p.priceCents)).replace('.', ','),
      vatRate: p.vatRate,
      costEuros:
        p.costCents == null
          ? ''
          : String(centsToEuros(p.costCents)).replace('.', ','),
      stockQuantity: String(p.stockQuantity),
      isFavorite: p.isFavorite,
      isQuick: p.isQuick,
      isActive: p.isActive,
    });
  }, [productQuery.data, reset]);

  const invalidateCatalog = async () => {
    await queryClient.invalidateQueries({ queryKey: ['products'] });
    await queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!canManage) throw new Error('Permission refusée');
      const repo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
      const price = parseEurosInput(values.priceEuros);
      if (price === null) throw new Error('Prix invalide');
      const costRaw = values.costEuros?.trim();
      const cost = costRaw ? parseEurosInput(costRaw) : null;
      if (costRaw && cost === null) throw new Error('Coût d’achat invalide');

      const previousImageUri = productQuery.data?.imageUri ?? null;

      if (isEdit && productId) {
        const result = await repo.update(
          {
            id: productId,
            sku: values.sku?.trim() || productQuery.data?.sku || '',
            barcode: values.barcode?.trim() || null,
            name: values.name,
            description: values.description?.trim() || null,
            categoryId: values.categoryId ?? null,
            priceCents: eurosToCents(price),
            vatRate: values.vatRate,
            costCents: cost == null ? null : eurosToCents(cost),
            isFavorite: values.isFavorite,
            isQuick: values.isQuick,
            isActive: values.isActive,
            imageUri,
          },
          userId,
        );
        if (!result.ok) throw result.error;
        if (previousImageUri && previousImageUri !== imageUri) {
          await deleteProductImageIfOwned(previousImageUri);
        }
        return result.value;
      }

      const stock = Number((values.stockQuantity || '0').replace(',', '.'));
      const result = await repo.create(
        {
          sku: values.sku?.trim() || undefined,
          barcode: values.barcode?.trim() || null,
          name: values.name,
          description: values.description?.trim() || null,
          categoryId: values.categoryId ?? null,
          priceCents: eurosToCents(price),
          vatRate: values.vatRate,
          costCents: cost == null ? null : eurosToCents(cost),
          stockQuantity: Number.isFinite(stock) ? stock : 0,
          isFavorite: values.isFavorite,
          isQuick: values.isQuick,
          imageUri,
        },
        userId,
      );
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: async () => {
      await invalidateCatalog();
      navigation.goBack();
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      if (!productId || !canManage) throw new Error('Permission refusée');
      const repo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
      const result = await repo.deactivate(productId, userId);
      if (!result.ok) throw result.error;
    },
    onSuccess: async () => {
      await invalidateCatalog();
      navigation.goBack();
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const stockMutation = useMutation({
    mutationFn: async () => {
      if (!productId || !userId || !canManage) throw new Error('Permission refusée');
      const qty = Number(stockDelta.replace(',', '.'));
      if (!Number.isFinite(qty) || qty === 0) throw new Error('Quantité invalide');
      const repo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
      const result = await repo.adjustStock({
        productId,
        userId,
        type: stockMode,
        quantity: qty,
        reason: stockReason.trim() || null,
      });
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: async () => {
      setStockDialogOpen(false);
      setStockDelta('');
      setStockReason('');
      await invalidateCatalog();
      await productQuery.refetch();
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const selectedCategoryName =
    categoriesQuery.data?.find((c) => c.id === watch('categoryId'))?.name ??
    'Sans catégorie';

  const submitProduct = handleSubmit((values) => {
    setFormError(null);
    saveMutation.mutate(values);
  });

  if (isEdit && productQuery.isLoading) {
    return (
      <Screen padded={false}>
        <ProductFormSkeleton />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text style={[typography.h2, { color: theme.colors.onSurface, flex: 1 }]}>
          {isEdit ? 'Modifier l’article' : 'Nouvel article'}
        </Text>
        {canManage ? (
          <Button
            mode="contained"
            compact
            loading={isSubmitting || saveMutation.isPending}
            onPress={submitProduct}
          >
            Enregistrer
          </Button>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {!canManage ? (
          <HelperText type="info" visible>
            Lecture seule — seuls les managers et admins peuvent modifier le catalogue.
          </HelperText>
        ) : null}

        <ProductImageField
          imageUri={imageUri}
          editable={canManage}
          onChange={setImageUri}
          compact
        />

        {isEdit ? (
          <View
            style={[
              styles.statsCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
            ]}
          >
            <Text style={[typography.h3, { color: theme.colors.onSurface }]}>
              Statistiques de vente
            </Text>
            <View style={styles.statsGrid}>
              <StatTile
                label="Vendus"
                value={String(salesStatsQuery.data?.quantitySold ?? 0)}
              />
              <StatTile
                label="CA"
                value={formatMoney(salesStatsQuery.data?.revenueCents ?? 0)}
              />
              <StatTile
                label="Tickets"
                value={String(salesStatsQuery.data?.ticketCount ?? 0)}
              />
              <StatTile
                label="Dernière vente"
                value={
                  salesStatsQuery.data?.lastSoldAt
                    ? new Date(salesStatsQuery.data.lastSoldAt).toLocaleDateString('fr-FR')
                    : '—'
                }
              />
            </View>
          </View>
        ) : null}

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Nom *"
              value={value}
              onChangeText={onChange}
              mode="outlined"
              dense
              disabled={!canManage}
              error={Boolean(errors.name)}
            />
          )}
        />
        <HelperText type="error" visible={Boolean(errors.name)} style={styles.tightHelp}>
          {errors.name?.message}
        </HelperText>

        <View style={styles.row}>
          <Controller
            control={control}
            name="sku"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label={isEdit ? 'SKU *' : 'SKU (auto)'}
                value={value ?? ''}
                onChangeText={onChange}
                autoCapitalize="characters"
                mode="outlined"
                dense
                disabled={!canManage}
                style={styles.half}
              />
            )}
          />
          <Controller
            control={control}
            name="barcode"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Code-barres"
                value={value ?? ''}
                onChangeText={onChange}
                mode="outlined"
                dense
                keyboardType="number-pad"
                disabled={!canManage}
                style={styles.half}
              />
            )}
          />
        </View>

        <Menu
          visible={categoryMenuOpen}
          onDismiss={() => setCategoryMenuOpen(false)}
          anchor={
            <Button
              mode="outlined"
              compact
              onPress={() => setCategoryMenuOpen(true)}
              disabled={!canManage}
              style={styles.field}
            >
              Catégorie : {selectedCategoryName}
            </Button>
          }
        >
          <Menu.Item
            onPress={() => {
              setValue('categoryId', null);
              setCategoryMenuOpen(false);
            }}
            title="Sans catégorie"
          />
          {(categoriesQuery.data ?? []).map((category) => (
            <Menu.Item
              key={category.id}
              onPress={() => {
                setValue('categoryId', category.id);
                setCategoryMenuOpen(false);
              }}
              title={category.name}
            />
          ))}
        </Menu>

        <View style={styles.row}>
          <Controller
            control={control}
            name="priceEuros"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Prix TTC (€) *"
                value={value}
                onChangeText={onChange}
                mode="outlined"
                dense
                keyboardType="decimal-pad"
                disabled={!canManage}
                error={Boolean(errors.priceEuros)}
                style={styles.third}
              />
            )}
          />
          <Menu
            visible={vatMenuOpen}
            onDismiss={() => setVatMenuOpen(false)}
            anchor={
              <Button
                mode="outlined"
                compact
                onPress={() => setVatMenuOpen(true)}
                disabled={!canManage}
                style={[styles.third, styles.vatBtn]}
              >
                TVA {watch('vatRate')}%
              </Button>
            }
          >
            {VAT_RATES.map((rate) => (
              <Menu.Item
                key={rate}
                onPress={() => {
                  setValue('vatRate', rate);
                  setVatMenuOpen(false);
                }}
                title={`${rate}%`}
              />
            ))}
          </Menu>
          <Controller
            control={control}
            name="costEuros"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Coût (€)"
                value={value ?? ''}
                onChangeText={onChange}
                mode="outlined"
                dense
                keyboardType="decimal-pad"
                disabled={!canManage}
                style={styles.third}
              />
            )}
          />
        </View>
        <HelperText type="error" visible={Boolean(errors.priceEuros)} style={styles.tightHelp}>
          {errors.priceEuros?.message}
        </HelperText>

        {!isEdit ? (
          <Controller
            control={control}
            name="stockQuantity"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Stock initial"
                value={value ?? '0'}
                onChangeText={onChange}
                mode="outlined"
                dense
                keyboardType="decimal-pad"
                disabled={!canManage}
                style={styles.field}
              />
            )}
          />
        ) : (
          <View style={[styles.stockBox, { borderColor: theme.colors.outline }]}>
            <Text style={[typography.bodyStrong, { color: theme.colors.onSurface, flex: 1 }]}>
              Stock : {productQuery.data?.stockQuantity ?? '—'}
            </Text>
            {canManage ? (
              <Button compact mode="contained-tonal" onPress={() => setStockDialogOpen(true)}>
                Ajuster
              </Button>
            ) : null}
          </View>
        )}

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Description"
              value={value ?? ''}
              onChangeText={onChange}
              mode="outlined"
              dense
              multiline
              numberOfLines={2}
              disabled={!canManage}
              style={styles.field}
            />
          )}
        />

        <View style={styles.flagsRow}>
          <View style={styles.flag}>
            <Text style={typography.caption}>Favori</Text>
            <Controller
              control={control}
              name="isFavorite"
              render={({ field: { onChange, value } }) => (
                <Switch value={value} onValueChange={onChange} disabled={!canManage} />
              )}
            />
          </View>
          <View style={styles.flag}>
            <Text style={typography.caption}>Rapide</Text>
            <Controller
              control={control}
              name="isQuick"
              render={({ field: { onChange, value } }) => (
                <Switch value={value} onValueChange={onChange} disabled={!canManage} />
              )}
            />
          </View>
          {isEdit ? (
            <View style={styles.flag}>
              <Text style={typography.caption}>Actif</Text>
              <Controller
                control={control}
                name="isActive"
                render={({ field: { onChange, value } }) => (
                  <Switch value={value} onValueChange={onChange} disabled={!canManage} />
                )}
              />
            </View>
          ) : null}
        </View>

        {formError ? (
          <HelperText type="error" visible>
            {formError}
          </HelperText>
        ) : null}

        {canManage ? (
          <View style={styles.actions}>
            <Button
              mode="contained"
              loading={isSubmitting || saveMutation.isPending}
              onPress={submitProduct}
            >
              Enregistrer
            </Button>
            {isEdit ? (
              <Button
                mode="outlined"
                textColor={theme.colors.error}
                onPress={() =>
                  Alert.alert(
                    'Désactiver l’article',
                    'L’article ne sera plus proposé à la vente.',
                    [
                      { text: 'Annuler', style: 'cancel' },
                      {
                        text: 'Désactiver',
                        style: 'destructive',
                        onPress: () => deactivateMutation.mutate(),
                      },
                    ],
                  )
                }
              >
                Désactiver
              </Button>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <Portal>
        <Dialog visible={stockDialogOpen} onDismiss={() => setStockDialogOpen(false)}>
          <Dialog.Title>Ajuster le stock</Dialog.Title>
          <Dialog.Content style={{ gap: spacing.sm }}>
            <View style={styles.chipRow}>
              {(['in', 'out', 'adjustment'] as const).map((mode) => (
                <Button
                  key={mode}
                  mode={stockMode === mode ? 'contained' : 'outlined'}
                  onPress={() => setStockMode(mode)}
                  compact
                >
                  {mode === 'in' ? 'Entrée' : mode === 'out' ? 'Sortie' : 'Inventaire'}
                </Button>
              ))}
            </View>
            <TextInput
              label={stockMode === 'adjustment' ? 'Quantité (+/-)' : 'Quantité'}
              value={stockDelta}
              onChangeText={setStockDelta}
              keyboardType="decimal-pad"
              mode="outlined"
            />
            <TextInput
              label="Motif"
              value={stockReason}
              onChangeText={setStockReason}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setStockDialogOpen(false)}>Annuler</Button>
            <Button
              loading={stockMutation.isPending}
              onPress={() => {
                setFormError(null);
                stockMutation.mutate();
              }}
            >
              Valider
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.statTile, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>
        {value}
      </Text>
    </View>
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.xs,
  },
  field: {
    marginTop: spacing.xs,
  },
  tightHelp: {
    marginTop: 0,
    marginBottom: 0,
    minHeight: 0,
    paddingVertical: 0,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
    alignItems: 'flex-start',
  },
  half: { flex: 1 },
  third: { flex: 1 },
  vatBtn: {
    marginTop: spacing.xs,
    justifyContent: 'center',
    minHeight: 48,
  },
  flagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  statsCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: spacing.md,
    gap: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statTile: {
    minWidth: '47%',
    flexGrow: 1,
    borderRadius: 12,
    padding: spacing.sm,
    gap: 2,
  },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  stockBox: {
    marginTop: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
