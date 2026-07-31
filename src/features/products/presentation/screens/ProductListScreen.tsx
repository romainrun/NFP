import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  Button,
  Chip,
  Searchbar,
  Text,
  useTheme,
} from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { ICategoryRepository } from '@/features/products/data/CategoryRepository';
import type { IProductRepository } from '@/features/products/data/ProductRepository';
import { ProductListItem } from '@/features/products/presentation/components/ProductListItem';
import { useCatalogAccess } from '@/features/products/presentation/hooks/useCatalogAccess';
import type { AppStackParamList, MainParamList } from '@/navigation/types';
import { AppHeader } from '@/shared/components/AppHeader';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay';
import { Screen } from '@/shared/components/Screen';
import { eurosToCents, parseEurosInput } from '@/shared/utils/money';
import { Colors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';

type ProductListNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<MainParamList, 'ProductList'>,
  NativeStackNavigationProp<AppStackParamList>
>;

type CsvProductRow = {
  sku?: string;
  name: string;
  barcode?: string | null;
  priceCents: number;
  vatRate: number;
  stockQuantity: number;
  categoryName?: string | null;
};

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if ((char === ';' || char === ',') && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseCsvProducts(raw: string): CsvProductRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]!).map((header) =>
    header.trim().toLowerCase().replace(/\s+/g, '_'),
  );

  const read = (cells: string[], names: string[]) => {
    const index = headers.findIndex((header) => names.includes(header));
    return index >= 0 ? cells[index]?.trim() ?? '' : '';
  };

  return lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line);
    const name = read(cells, ['name', 'nom', 'designation', 'désignation']);
    const sku = read(cells, ['sku', 'reference', 'référence']);
    const barcode = read(cells, ['barcode', 'code_barres', 'ean']);
    const priceCentsRaw = read(cells, ['price_cents', 'prix_centimes']);
    const priceRaw = read(cells, ['price', 'prix', 'prix_ttc']);
    const vatRaw = read(cells, ['vat', 'tva', 'vat_rate']);
    const stockRaw = read(cells, ['stock', 'stock_quantity', 'quantite', 'quantité']);
    const categoryName = read(cells, ['category', 'categorie', 'catégorie']);
    const parsedPrice = priceCentsRaw
      ? Number(priceCentsRaw)
      : eurosToCents(parseEurosInput(priceRaw) ?? Number.NaN);
    const vatRate = vatRaw ? Number(vatRaw.replace(',', '.')) : 5.5;
    const stockQuantity = stockRaw ? Number(stockRaw.replace(',', '.')) : 0;

    if (!name || !Number.isFinite(parsedPrice)) {
      throw new Error(`Ligne ${index + 2}: nom ou prix invalide`);
    }

    return {
      sku: sku || undefined,
      name,
      barcode: barcode || null,
      priceCents: Math.round(parsedPrice),
      vatRate: Number.isFinite(vatRate) ? vatRate : 5.5,
      stockQuantity: Number.isFinite(stockQuantity) ? stockQuantity : 0,
      categoryName: categoryName || null,
    };
  });
}

export function ProductListScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const navigation = useNavigation<ProductListNavigation>();
  const { canManage, userId } = useCatalogAccess();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [quickOnly, setQuickOnly] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: async () => {
      const repo = container.resolve<ICategoryRepository>(TOKENS.CategoryRepository);
      const result = await repo.list(false);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const productsQuery = useQuery({
    queryKey: [
      'products',
      'list',
      search,
      categoryId,
      favoritesOnly,
      quickOnly,
      includeInactive,
    ],
    queryFn: async () => {
      const repo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
      const result = await repo.list({
        search,
        categoryId,
        favoritesOnly,
        quickOnly,
        includeInactive,
      });
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!canManage) throw new Error('Permission refusée');
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return { created: 0, updated: 0, skipped: true };

      const asset = picked.assets[0];
      if (!asset) throw new Error('Fichier introuvable');
      const content = await FileSystem.readAsStringAsync(asset.uri);
      const rows = parseCsvProducts(content);
      const productRepo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
      const categories = categoriesQuery.data ?? [];
      let created = 0;
      let updated = 0;

      for (const row of rows) {
        const categoryId =
          categories.find(
            (category) =>
              row.categoryName &&
              category.name.trim().toLowerCase() === row.categoryName.trim().toLowerCase(),
          )?.id ?? null;

        const existing = row.sku ? await productRepo.getBySku(row.sku) : null;
        if (existing?.ok) {
          const result = await productRepo.update(
            {
              id: existing.value.id,
              sku: existing.value.sku,
              barcode: row.barcode,
              name: row.name,
              description: existing.value.description,
              categoryId,
              priceCents: row.priceCents,
              vatRate: row.vatRate,
              costCents: existing.value.costCents,
              isFavorite: existing.value.isFavorite,
              isQuick: existing.value.isQuick,
              imageUri: existing.value.imageUri,
              isActive: existing.value.isActive,
            },
            userId,
          );
          if (!result.ok) throw result.error;
          updated += 1;
        } else {
          const result = await productRepo.create(
            {
              sku: row.sku,
              barcode: row.barcode,
              name: row.name,
              categoryId,
              priceCents: row.priceCents,
              vatRate: row.vatRate,
              stockQuantity: row.stockQuantity,
            },
            userId,
          );
          if (!result.ok) throw result.error;
          created += 1;
        }
      }
      return { created, updated, skipped: false };
    },
    onSuccess: async (result) => {
      if (!result.skipped) {
        Alert.alert('Import terminé', `${result.created} créé(s), ${result.updated} mis à jour.`);
      }
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: Error) => Alert.alert('Import impossible', error.message),
  });

  const emptyLabel = useMemo(() => {
    if (search.trim()) return 'Aucun article ne correspond à la recherche.';
    return 'Aucun article pour le moment.';
  }, [search]);

  if (productsQuery.isLoading && !productsQuery.data) {
    return <LoadingOverlay label="Chargement du catalogue…" />;
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <AppHeader
          title="Articles"
          subtitle={`${productsQuery.data?.length ?? 0} produit${(productsQuery.data?.length ?? 0) > 1 ? 's' : ''}`}
          right={
            canManage ? (
              <View style={styles.headerActions}>
                <Button mode="outlined" onPress={() => navigation.navigate('CategoryList')}>
                  Catégories
                </Button>
                <Button
                  mode="outlined"
                  loading={importMutation.isPending}
                  onPress={() => importMutation.mutate()}
                >
                  Importer
                </Button>
                <Button mode="contained" onPress={() => navigation.navigate('ProductForm', {})}>
                  Ajouter
                </Button>
              </View>
            ) : undefined
          }
        />
      </View>

      <View style={styles.filters}>
        <Searchbar
          placeholder="Nom, SKU ou code-barres"
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilterList}
          data={[
            { id: 'all', label: 'Tous', color: Colors.primary },
            ...(categoriesQuery.data ?? []).map((c) => ({
              id: c.id,
              label: c.name,
              color: c.color ?? Colors.primary,
            })),
          ]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chipRow}
          renderItem={({ item }) => (
            (() => {
              const selected = item.id === 'all' ? categoryId === null : categoryId === item.id;
              return (
                <Chip
                  selected={selected}
                  onPress={() => setCategoryId(item.id === 'all' ? null : item.id)}
                  style={[
                    styles.chip,
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
            })()
          )}
        />
        <View style={styles.chipRow}>
          <Chip selected={favoritesOnly} onPress={() => setFavoritesOnly((v) => !v)}>
            Favoris
          </Chip>
          <Chip selected={quickOnly} onPress={() => setQuickOnly((v) => !v)}>
            Rapides
          </Chip>
          {canManage ? (
            <Chip
              selected={includeInactive}
              onPress={() => setIncludeInactive((v) => !v)}
            >
              Inclure inactifs
            </Chip>
          ) : null}
        </View>
      </View>

      <FlatList
        data={productsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={productsQuery.isRefetching}
        onRefresh={() => void productsQuery.refetch()}
        ListEmptyComponent={
          <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            {emptyLabel}
          </Text>
        }
        renderItem={({ item }) => (
          <ProductListItem
            product={item}
            onPress={(product) =>
              navigation.navigate('ProductForm', { productId: product.id })
            }
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: 320,
  },
  filters: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  search: {
    elevation: 0,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  categoryFilterList: {
    maxHeight: 42,
  },
  chip: {
    marginRight: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
