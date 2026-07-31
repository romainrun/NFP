import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  Button,
  Chip,
  Searchbar,
  Text,
  useTheme,
} from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
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
import { spacing } from '@/shared/theme/spacing';

type ProductListNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<MainParamList, 'ProductList'>,
  NativeStackNavigationProp<AppStackParamList>
>;

export function ProductListScreen() {
  const theme = useTheme();
  const navigation = useNavigation<ProductListNavigation>();
  const { canManage } = useCatalogAccess();
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
          data={[
            { id: 'all', label: 'Tous' },
            ...(categoriesQuery.data ?? []).map((c) => ({ id: c.id, label: c.name })),
          ]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chipRow}
          renderItem={({ item }) => (
            <Chip
              selected={
                item.id === 'all' ? categoryId === null : categoryId === item.id
              }
              onPress={() => setCategoryId(item.id === 'all' ? null : item.id)}
              style={styles.chip}
            >
              {item.label}
            </Chip>
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
  chip: {
    marginRight: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
