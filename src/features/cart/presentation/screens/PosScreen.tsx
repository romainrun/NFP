import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  Chip,
  Dialog,
  HelperText,
  Portal,
  Searchbar,
  SegmentedButtons,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { ICartRepository } from '@/features/cart/data/CartRepository';
import { BarcodeScannerModal } from '@/features/cart/presentation/components/BarcodeScannerModal';
import { CartLineRow } from '@/features/cart/presentation/components/CartLineRow';
import { PosProductTile } from '@/features/cart/presentation/components/PosProductTile';
import { hasPermission } from '@/features/authentication/domain/permissions';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import { useSalesAccess } from '@/features/cart/presentation/hooks/useSalesAccess';
import type { ICategoryRepository } from '@/features/products/data/CategoryRepository';
import type { IProductRepository } from '@/features/products/data/ProductRepository';
import type { Product } from '@/features/products/domain/types';
import { useCatalogAccess } from '@/features/products/presentation/hooks/useCatalogAccess';
import type { IPromotionRepository } from '@/features/promotions/data/PromotionRepository';
import { isPromotionRuleActive } from '@/features/promotions/domain/types';
import type { AppStackParamList, MainParamList } from '@/navigation/types';
import { AnimatedPressable } from '@/shared/components/AnimatedPressable';
import { AppHeader } from '@/shared/components/AppHeader';
import { QueryErrorPanel } from '@/shared/components/QueryErrorPanel';
import { PosSkeleton } from '@/shared/components/skeletons';
import { Screen } from '@/shared/components/Screen';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { vibrateScan, vibrateSuccess, vibrateTap } from '@/shared/utils/haptics';
import { eurosToCents, formatMoney, parseEurosInput } from '@/shared/utils/money';
import { Colors } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type PosNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<MainParamList, 'Pos'>,
  NativeStackNavigationProp<AppStackParamList>
>;

type CatalogTab = 'top' | 'favorites';
type DiscountTarget = 'cart' | 'line';
const DISCOUNT_PRESETS = [5, 10, 15, 20, 25, 30] as const;

function isStockErrorMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('stock') || lower.includes('épuisé');
}

export function PosScreen() {
  const navigation = useNavigation<PosNavigation>();
  const searchRef = useRef<{ focus?: () => void } | null>(null);
  const theme = useTheme();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { useSplitLayout, isPhone } = useResponsiveLayout();
  const { session } = useAuth();
  const { canSell, userId } = useSalesAccess();
  const canOversell = Boolean(session && hasPermission(session.employee.role, 'sales.oversell'));
  const { canManage: canManageCatalog, userId: catalogUserId } = useCatalogAccess();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const [catalogTab, setCatalogTab] = useState<CatalogTab>('top');
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [associationSearch, setAssociationSearch] = useState('');
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [discountTarget, setDiscountTarget] = useState<DiscountTarget>('cart');
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [discountMode, setDiscountMode] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState('');

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

  const productsQuery = useQuery({
    queryKey: ['products', 'pos', search, catalogTab, categoryId],
    enabled: canSell,
    queryFn: async () => {
      const repo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
      if (search.trim()) {
        const result = await repo.list({
          search: search.trim(),
          categoryId,
          includeInactive: false,
        });
        if (!result.ok) throw result.error;
        return result.value;
      }
      if (catalogTab === 'favorites') {
        const result = await repo.list({ includeInactive: false, categoryId });
        if (!result.ok) throw result.error;
        const favorites = result.value.filter((p) => p.isFavorite || p.isQuick);
        return favorites.length ? favorites : result.value.slice(0, 24);
      }
      if (categoryId) {
        const result = await repo.list({ includeInactive: false, categoryId });
        if (!result.ok) throw result.error;
        return result.value;
      }
      const top = await repo.listTopSelling(24);
      if (!top.ok) throw top.error;
      return top.value;
    },
    placeholderData: keepPreviousData,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'pos-filter'],
    enabled: canSell,
    queryFn: async () => {
      const repo = container.resolve<ICategoryRepository>(TOKENS.CategoryRepository);
      const result = await repo.list(false);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const promotionsQuery = useQuery({
    queryKey: ['promotions', 'pos'],
    enabled: canSell,
    queryFn: async () => {
      const repo = container.resolve<IPromotionRepository>(TOKENS.PromotionRepository);
      const result = await repo.listRules();
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const activePromotions = useMemo(() => {
    const map = new Map<string, number>();
    for (const rule of promotionsQuery.data ?? []) {
      if (isPromotionRuleActive(rule)) map.set(rule.productId, rule.discountBps);
    }
    return map;
  }, [promotionsQuery.data]);

  const barcodeProductsQuery = useQuery({
    queryKey: ['products', 'barcode-association', unknownBarcode],
    enabled: Boolean(unknownBarcode && canManageCatalog),
    queryFn: async () => {
      const repo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
      const result = await repo.list({ includeInactive: false });
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({ productId, bypass }: { productId: string; bypass?: boolean }) => {
      const repo = container.resolve<ICartRepository>(TOKENS.CartRepository);
      const result = await repo.addProduct(userId!, productId, 1, {
        bypassStockCheck: bypass,
      });
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: async (cart) => {
      queryClient.setQueryData(['cart', userId], cart);
      vibrateTap();
      setSnack('Article ajouté');
    },
    onError: (error: Error, { productId }) => {
      if (canOversell && isStockErrorMessage(error.message)) {
        Alert.alert(
          'Stock insuffisant',
          `${error.message}\n\nForcer l’ajout au panier ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Forcer',
              style: 'destructive',
              onPress: () => addMutation.mutate({ productId, bypass: true }),
            },
          ],
        );
        return;
      }
      setSnack(error.message);
    },
  });

  const associateBarcodeMutation = useMutation({
    mutationFn: async (product: Product) => {
      if (!unknownBarcode || !catalogUserId) {
        throw new Error('Code-barres invalide');
      }
      const repo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
      const result = await repo.update(
        {
          id: product.id,
          sku: product.sku,
          barcode: unknownBarcode,
          name: product.name,
          description: product.description,
          categoryId: product.categoryId,
          priceCents: product.priceCents,
          vatRate: product.vatRate,
          costCents: product.costCents,
          isFavorite: product.isFavorite,
          isQuick: product.isQuick,
          imageUri: product.imageUri,
          isActive: product.isActive,
        },
        catalogUserId,
      );
      if (!result.ok) throw result.error;
      return { product: result.value, barcode: unknownBarcode };
    },
    onSuccess: async ({ barcode }) => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setUnknownBarcode(null);
      setAssociationSearch('');
      barcodeMutation.mutate({ code: barcode });
    },
    onError: (error: Error) => setSnack(error.message),
  });

  const barcodeMutation = useMutation({
    mutationFn: async ({ code, bypass }: { code: string; bypass?: boolean }) => {
      const repo = container.resolve<ICartRepository>(TOKENS.CartRepository);
      const options = { bypassStockCheck: bypass };
      const byBarcode = await repo.addByBarcode(userId!, code, 1, options);
      if (byBarcode.ok) return byBarcode.value;
      const bySku = await repo.addBySku(userId!, code, 1, options);
      if (bySku.ok) return bySku.value;
      throw byBarcode.error;
    },
    onSuccess: async (cart) => {
      queryClient.setQueryData(['cart', userId], cart);
      setManualCode('');
      vibrateSuccess();
      setSnack('Article scanné');
    },
    onError: (error: Error, { code }) => {
      if (canManageCatalog) {
        setUnknownBarcode(code);
        return;
      }
      if (canOversell && isStockErrorMessage(error.message)) {
        Alert.alert(
          'Stock insuffisant',
          `${error.message}\n\nForcer l’ajout au panier ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Forcer',
              style: 'destructive',
              onPress: () => barcodeMutation.mutate({ code, bypass: true }),
            },
          ],
        );
        return;
      }
      setSnack(error.message);
    },
  });

  const scanBarcode = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;
    vibrateScan();
    barcodeMutation.mutate({ code });
  };

  const focusProductSearch = () => {
    setCartSheetOpen(false);
    requestAnimationFrame(() => searchRef.current?.focus?.());
  };

  const openDiscountDialog = () => {
    setDiscountTarget('cart');
    setSelectedLineId(null);
    setDiscountMode('percent');
    setDiscountValue('');
    setDiscountDialogOpen(true);
  };

  const qtyMutation = useMutation({
    mutationFn: async ({ lineId, quantity }: { lineId: string; quantity: number }) => {
      const repo = container.resolve<ICartRepository>(TOKENS.CartRepository);
      const result = await repo.setLineQuantity(lineId, quantity);
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: (cart) => queryClient.setQueryData(['cart', userId], cart),
    onError: (error: Error) => setSnack(error.message),
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const repo = container.resolve<ICartRepository>(TOKENS.CartRepository);
      const result = await repo.clear(cartQuery.data!.id);
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: (cart) => queryClient.setQueryData(['cart', userId], cart),
  });

  const discountMutation = useMutation({
    mutationFn: async () => {
      if (!cartQuery.data) throw new Error('Panier introuvable');
      if (cartQuery.data.lines.length === 0) throw new Error('Panier vide');
      const repo = container.resolve<ICartRepository>(TOKENS.CartRepository);
      let discountBps = 0;

      if (discountTarget === 'line') {
        if (!selectedLineId) throw new Error('Sélectionnez un article');
        const line = cartQuery.data.lines.find((item) => item.id === selectedLineId);
        if (!line) throw new Error('Article introuvable');
        const lineGrossCents = line.unitPriceCents * line.quantity;
        if (lineGrossCents <= 0) throw new Error('Montant de ligne invalide');

        if (discountMode === 'percent') {
          const percent = Number(discountValue.trim().replace(',', '.'));
          if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
            throw new Error('Pourcentage invalide');
          }
          discountBps = Math.round(percent * 100);
        } else {
          const euros = parseEurosInput(discountValue);
          if (euros == null) throw new Error('Montant invalide');
          const cents = eurosToCents(euros);
          if (cents < 0 || cents > lineGrossCents) {
            throw new Error('Montant de remise invalide');
          }
          discountBps = Math.round((cents / lineGrossCents) * 10_000);
        }

        const result = await repo.setLineDiscountBps(
          selectedLineId,
          Math.min(10_000, Math.max(0, discountBps)),
        );
        if (!result.ok) throw result.error;
        return { cart: result.value, kind: 'line' as const };
      }

      if (cartQuery.data.subtotalCents <= 0) throw new Error('Panier vide');

      if (discountMode === 'percent') {
        const percent = Number(discountValue.trim().replace(',', '.'));
        if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
          throw new Error('Pourcentage invalide');
        }
        discountBps = Math.round(percent * 100);
      } else {
        const euros = parseEurosInput(discountValue);
        if (euros == null) throw new Error('Montant invalide');
        const cents = eurosToCents(euros);
        if (cents < 0 || cents > cartQuery.data.subtotalCents) {
          throw new Error('Montant de remise invalide');
        }
        discountBps = Math.round((cents / cartQuery.data.subtotalCents) * 10_000);
      }

      const result = await repo.setGlobalDiscountBps(
        cartQuery.data.id,
        Math.min(10_000, Math.max(0, discountBps)),
      );
      if (!result.ok) throw result.error;
      return { cart: result.value, kind: 'cart' as const };
    },
    onSuccess: ({ cart, kind }) => {
      queryClient.setQueryData(['cart', userId], cart);
      setDiscountDialogOpen(false);
      setDiscountValue('');
      setSnack(
        kind === 'line' || cart.discountCents > 0 ? 'Remise appliquée' : 'Remise retirée',
      );
    },
    onError: (error: Error) => setSnack(error.message),
  });

  const applyPromotionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLineId || !cartQuery.data) throw new Error('Article invalide');
      const line = cartQuery.data.lines.find((item) => item.id === selectedLineId);
      if (!line) throw new Error('Article introuvable');
      const promoBps = activePromotions.get(line.productId) ?? 0;
      if (promoBps <= 0) throw new Error('Aucune promotion active pour cet article');
      const repo = container.resolve<ICartRepository>(TOKENS.CartRepository);
      const result = await repo.setLineDiscountBps(selectedLineId, promoBps);
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(['cart', userId], cart);
      setDiscountDialogOpen(false);
      setSnack('Promotion appliquée');
    },
    onError: (error: Error) => setSnack(error.message),
  });

  const clearLineDiscountMutation = useMutation({
    mutationFn: async (lineId: string) => {
      const repo = container.resolve<ICartRepository>(TOKENS.CartRepository);
      const result = await repo.setLineDiscountBps(lineId, 0);
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(['cart', userId], cart);
      setSnack('Remise article retirée');
    },
    onError: (error: Error) => setSnack(error.message),
  });

  const clearDiscountMutation = useMutation({
    mutationFn: async () => {
      if (!cartQuery.data) throw new Error('Panier introuvable');
      const repo = container.resolve<ICartRepository>(TOKENS.CartRepository);
      const result = await repo.setGlobalDiscountBps(cartQuery.data.id, 0);
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(['cart', userId], cart);
      setSnack('Remise retirée');
    },
    onError: (error: Error) => setSnack(error.message),
  });

  const gridProducts = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const categoryColors = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const category of categoriesQuery.data ?? []) map.set(category.id, category.color);
    return map;
  }, [categoriesQuery.data]);
  const associationProducts = useMemo(() => {
    const query = associationSearch.trim().toLowerCase();
    const products = barcodeProductsQuery.data ?? [];
    if (!query) return products.slice(0, 20);
    return products
      .filter((product) => {
        const haystack = [
          product.name,
          product.sku,
          product.barcode ?? '',
          product.categoryName ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 20);
  }, [associationSearch, barcodeProductsQuery.data]);

  const selectedDiscountLine = useMemo(() => {
    if (!selectedLineId || !cartQuery.data) return null;
    return cartQuery.data.lines.find((line) => line.id === selectedLineId) ?? null;
  }, [cartQuery.data, selectedLineId]);

  const catalogPromoBpsForLine = useMemo(() => {
    if (!selectedDiscountLine) return 0;
    return activePromotions.get(selectedDiscountLine.productId) ?? 0;
  }, [activePromotions, selectedDiscountLine]);

  if (!canSell) {
    return (
      <Screen centered>
        <Text style={[typography.h2, { color: theme.colors.onSurface }]}>
          Accès caisse refusé
        </Text>
        <Button onPress={() => navigation.goBack()}>Retour</Button>
      </Screen>
    );
  }

  if (cartQuery.isError) {
    return (
      <QueryErrorPanel
        onRetry={() => {
          void cartQuery.refetch();
        }}
      />
    );
  }

  if (cartQuery.isLoading || !cartQuery.data) {
    return (
      <Screen padded={false}>
        <PosSkeleton splitLayout={useSplitLayout} />
      </Screen>
    );
  }

  const cartBarBottom = spacing.md + insets.bottom;
  const phoneGridPadding = isPhone ? spacing.xxl + 72 + insets.bottom : spacing.xl;

  const cart = cartQuery.data;

  const handleProductPress = (product: Product) => {
    if (product.stockQuantity <= 0 && !canOversell) {
      setSnack(`« ${product.name} » — stock épuisé`);
      return;
    }
    addMutation.mutate({ productId: product.id });
  };

  const catalog = (
    <View style={styles.pane}>
      <AppHeader
        title="Caisse"
        subtitle="Scan, plus vendus ou favoris"
        right={
          <Button mode="contained-tonal" icon="barcode-scan" onPress={() => setScannerOpen(true)}>
            Scanner
          </Button>
        }
      />

      <View style={styles.filterBlock}>
        <View style={styles.manualRowTop}>
          <TextInput
            mode="outlined"
            dense
            label="Code-barres / SKU"
            value={manualCode}
            onChangeText={setManualCode}
            style={{ flex: 1 }}
            autoCapitalize="characters"
            onSubmitEditing={() => {
              scanBarcode(manualCode);
            }}
            right={
              <TextInput.Icon
                icon="keyboard-return"
                onPress={() => {
                  scanBarcode(manualCode);
                }}
              />
            }
          />
        </View>

        <Searchbar
          ref={searchRef as never}
          placeholder="Rechercher un article"
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />

        {!search.trim() ? (
          <SegmentedButtons
            value={catalogTab}
            onValueChange={(value) => setCatalogTab(value as CatalogTab)}
            buttons={[
              {
                value: 'top',
                label: 'Plus vendus',
                icon: 'fire',
                style: styles.tabButton,
                labelStyle: styles.tabButtonLabel,
              },
              {
                value: 'favorites',
                label: 'Favoris',
                icon: 'star',
                style: styles.tabButton,
                labelStyle: styles.tabButtonLabel,
              },
            ]}
            style={styles.tabs}
          />
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilterScroll}
          contentContainerStyle={styles.categoryChips}
        >
          {[
            { id: 'all', label: 'Tous', color: Colors.primary },
            ...(categoriesQuery.data ?? []).map((category) => ({
              id: category.id,
              label: category.name,
              color: category.color ?? Colors.primary,
            })),
          ].map((item) => {
            const selected = item.id === 'all' ? categoryId === null : categoryId === item.id;
            return (
              <Chip
                key={item.id}
                selected={selected}
                compact
                onPress={() => setCategoryId(item.id === 'all' ? null : item.id)}
                style={[
                  styles.categoryChip,
                  {
                    borderColor: item.color,
                    backgroundColor: selected ? item.color : 'transparent',
                  },
                ]}
                textStyle={[
                  styles.categoryChipText,
                  { color: selected ? Colors.white : item.color },
                ]}
              >
                {item.label}
              </Chip>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={gridProducts}
        keyExtractor={(item) => item.id}
        numColumns={useSplitLayout ? 3 : 2}
        key={`${useSplitLayout ? 'tablet' : 'phone'}-${catalogTab}`}
        style={styles.productGrid}
        contentContainerStyle={[styles.grid, { paddingBottom: phoneGridPadding }]}
        refreshing={productsQuery.isRefetching}
        onRefresh={() => void productsQuery.refetch()}
        ListEmptyComponent={
          <Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>
            Aucun article trouvé
          </Text>
        }
        renderItem={({ item }) => (
          <PosProductTile
            product={item}
            promotionBps={activePromotions.get(item.id) ?? 0}
            categoryColor={item.categoryId ? categoryColors.get(item.categoryId) ?? null : null}
            onPress={() => handleProductPress(item)}
          />
        )}
      />
    </View>
  );

  const cartPane = (
    <View
      style={[
        styles.cartPane,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}
    >
      <View style={styles.cartHeader}>
        <Text style={[typography.h3, { color: theme.colors.onSurface }]}>
          Panier ({cart.itemCount})
        </Text>
        {cart.lines.length ? (
          <Button
            compact
            onPress={() =>
              Alert.alert('Vider le panier', 'Supprimer toutes les lignes ?', [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Vider', style: 'destructive', onPress: () => clearMutation.mutate() },
              ])
            }
          >
            Vider
          </Button>
        ) : null}
      </View>

      <FlatList
        data={cart.lines}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.md }}
        ListEmptyComponent={
          <Pressable onPress={focusProductSearch} style={styles.emptyCartSearch}>
            <HelperText type="info" visible>
              Panier vide — touchez ici pour rechercher un produit.
            </HelperText>
          </Pressable>
        }
        renderItem={({ item }) => (
          <CartLineRow
            line={item}
            compact={!useSplitLayout}
            onIncrement={() =>
              qtyMutation.mutate({ lineId: item.id, quantity: item.quantity + 1 })
            }
            onIncrementFast={() =>
              qtyMutation.mutate({ lineId: item.id, quantity: item.quantity + 5 })
            }
            onDecrement={() =>
              qtyMutation.mutate({ lineId: item.id, quantity: item.quantity - 1 })
            }
            onRemove={() => qtyMutation.mutate({ lineId: item.id, quantity: 0 })}
          />
        )}
      />

      <View style={styles.totals}>
        <View style={styles.discountActions}>
          <Button compact mode="outlined" onPress={openDiscountDialog}>
            Remise
          </Button>
          {cart.discountCents > 0 ? (
            <Button
              compact
              textColor={theme.colors.error}
              loading={clearDiscountMutation.isPending}
              onPress={() => clearDiscountMutation.mutate()}
            >
              Retirer
            </Button>
          ) : null}
        </View>
        <TotalRow label="Sous-total" value={formatMoney(cart.subtotalCents)} />
        {cart.discountCents > 0 ? (
          <TotalRow label="Remise" value={`- ${formatMoney(cart.discountCents)}`} />
        ) : null}
        <TotalRow label="dont TVA" value={formatMoney(cart.vatCents)} muted />
        <TotalRow label="Total TTC" value={formatMoney(cart.totalCents)} strong />
      </View>

      <Button
        mode="contained"
        disabled={cart.lines.length === 0}
        style={styles.checkoutBtn}
        contentStyle={{ minHeight: 52 }}
        onPress={() => {
          setCartSheetOpen(false);
          navigation.navigate('Checkout');
        }}
      >
        Encaisser
      </Button>
    </View>
  );

  return (
    <Screen padded={false}>
      <View style={[styles.shell, useSplitLayout && styles.shellTablet]}>
        <View style={{ flex: useSplitLayout ? 1.35 : 1 }}>{catalog}</View>
        {useSplitLayout ? <View style={{ flex: 1 }}>{cartPane}</View> : null}
      </View>

      {!useSplitLayout ? (
        <>
          <AnimatedPressable
            onPress={() => setCartSheetOpen(true)}
            style={[
              styles.cartBar,
              { backgroundColor: theme.colors.surface, bottom: cartBarBottom },
            ]}
            scaleTo={0.985}
          >
            <View>
              <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>
                Panier ({cart.itemCount})
              </Text>
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                {cart.lines.length ? 'Touchez pour vérifier le panier' : 'Aucun article'}
              </Text>
            </View>
            <Text style={[typography.money, { color: theme.colors.primary }]}>
              {formatMoney(cart.totalCents)}
            </Text>
          </AnimatedPressable>

          <Modal
            visible={cartSheetOpen}
            transparent
            animationType="slide"
            onRequestClose={() => setCartSheetOpen(false)}
          >
            <Pressable
              style={styles.sheetOverlay}
              onPress={() => setCartSheetOpen(false)}
            />
            <View style={styles.sheetWrap}>
              <View style={styles.sheetHandle} />
              {cartPane}
            </View>
          </Modal>
        </>
      ) : null}

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => {
          setScannerOpen(false);
          scanBarcode(code);
        }}
      />

      <Snackbar
        visible={Boolean(snack)}
        onDismiss={() => setSnack(null)}
        duration={2600}
        action={{ label: 'OK', onPress: () => setSnack(null) }}
        wrapperStyle={styles.snackbarWrapper}
      >
        {snack}
      </Snackbar>

      <Portal>
        <Dialog
          visible={discountDialogOpen}
          onDismiss={() => setDiscountDialogOpen(false)}
        >
          <Dialog.Title>Remise</Dialog.Title>
          <Dialog.ScrollArea style={styles.discountDialogScroll}>
            <ScrollView contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}>
              <SegmentedButtons
                value={discountTarget}
                onValueChange={(value) => {
                  const target = value as DiscountTarget;
                  setDiscountTarget(target);
                  if (target === 'cart') setSelectedLineId(null);
                  else if (!selectedLineId && cart.lines.length === 1) {
                    setSelectedLineId(cart.lines[0]!.id);
                  }
                }}
                buttons={[
                  { value: 'cart', label: 'Panier entier' },
                  { value: 'line', label: 'Un article' },
                ]}
              />

              {discountTarget === 'line' ? (
                <View style={styles.linePicker}>
                  <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                    Article à remiser
                  </Text>
                  {cart.lines.map((line) => {
                    const selected = selectedLineId === line.id;
                    const linePromo = activePromotions.get(line.productId) ?? 0;
                    return (
                      <Pressable
                        key={line.id}
                        onPress={() => {
                          setSelectedLineId(line.id);
                          vibrateTap();
                        }}
                        style={[
                          styles.linePickerRow,
                          {
                            borderColor: selected ? theme.colors.primary : theme.colors.outline,
                            backgroundColor: selected
                              ? theme.colors.primaryContainer
                              : theme.colors.surface,
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              typography.bodyStrong,
                              { color: theme.colors.onSurface },
                            ]}
                          >
                            {line.productName}
                          </Text>
                          <Text
                            style={[
                              typography.caption,
                              { color: theme.colors.onSurfaceVariant },
                            ]}
                          >
                            {line.quantity} × {formatMoney(line.unitPriceCents)}
                            {line.discountBps > 0 ? ` · -${line.discountBps / 100}%` : ''}
                            {linePromo > 0 ? ` · promo dispo -${linePromo / 100}%` : ''}
                          </Text>
                        </View>
                        {selected ? (
                          <Text style={{ color: theme.colors.primary }}>✓</Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {discountTarget === 'line' &&
              selectedLineId &&
              catalogPromoBpsForLine > 0 &&
              selectedDiscountLine?.discountBps !== catalogPromoBpsForLine ? (
                <Button
                  mode="contained-tonal"
                  loading={applyPromotionMutation.isPending}
                  onPress={() => applyPromotionMutation.mutate()}
                >
                  Appliquer promo catalogue (-{catalogPromoBpsForLine / 100}%)
                </Button>
              ) : null}

              {discountTarget === 'line' &&
              selectedDiscountLine &&
              selectedDiscountLine.discountBps > 0 ? (
                <Button
                  compact
                  textColor={theme.colors.error}
                  loading={clearLineDiscountMutation.isPending}
                  onPress={() => clearLineDiscountMutation.mutate(selectedDiscountLine.id)}
                >
                  Retirer la remise sur cet article
                </Button>
              ) : null}

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
                {DISCOUNT_PRESETS.map((preset) => {
                  const selected = discountValue.trim().replace(',', '.') === String(preset);
                  return (
                    <Chip
                      key={`${discountMode}-${preset}`}
                      selected={selected}
                      onPress={() => {
                        setDiscountValue(String(preset));
                        vibrateTap();
                      }}
                      style={styles.discountPresetChip}
                    >
                      {discountMode === 'percent' ? `${preset}%` : `${preset} €`}
                    </Chip>
                  );
                })}
              </View>
              <TextInput
                mode="outlined"
                label={
                  discountMode === 'percent' ? 'Remise custom (%)' : 'Remise custom (€)'
                }
                value={discountValue}
                onChangeText={setDiscountValue}
                keyboardType="decimal-pad"
                placeholder={discountMode === 'percent' ? '10' : '5,00'}
              />
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDiscountDialogOpen(false)}>Annuler</Button>
            <Button
              loading={discountMutation.isPending}
              disabled={discountTarget === 'line' && !selectedLineId}
              onPress={() => discountMutation.mutate()}
            >
              Appliquer
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={Boolean(unknownBarcode)}
          onDismiss={() => {
            setUnknownBarcode(null);
            setAssociationSearch('');
          }}
        >
          <Dialog.Title>Code-barres inconnu</Dialog.Title>
          <Dialog.Content style={{ gap: spacing.sm }}>
            <Text style={[typography.body, { color: theme.colors.onSurface }]}>
              Aucun article trouvé pour {unknownBarcode}.
            </Text>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => {
                const barcode = unknownBarcode;
                setUnknownBarcode(null);
                setAssociationSearch('');
                navigation.navigate('ProductForm', { initialBarcode: barcode ?? undefined });
              }}
            >
              Créer un article avec ce code
            </Button>
            <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
              Ou associer ce code à un article existant :
            </Text>
            <Searchbar
              placeholder="Rechercher un produit"
              value={associationSearch}
              onChangeText={setAssociationSearch}
              style={styles.associationSearch}
            />
            <FlatList
              data={associationProducts}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 260 }}
              ListEmptyComponent={
                <HelperText type="info" visible>
                  Aucun article disponible.
                </HelperText>
              }
              renderItem={({ item }) => (
                <AnimatedPressable
                  onPress={() => associateBarcodeMutation.mutate(item)}
                  style={[styles.associationRow, { borderColor: theme.colors.outline }]}
                  scaleTo={0.985}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>
                      {item.name}
                    </Text>
                    <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                      {item.sku}
                      {item.barcode ? ` · ${item.barcode}` : ''}
                    </Text>
                  </View>
                  <Text style={[typography.money, { color: theme.colors.primary }]}>
                    {formatMoney(item.priceCents)}
                  </Text>
                </AnimatedPressable>
              )}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setUnknownBarcode(null);
                setAssociationSearch('');
              }}
            >
              Fermer
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

function TotalRow({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.totalRow}>
      <Text
        style={{
          color: muted ? theme.colors.onSurfaceVariant : theme.colors.onSurface,
          fontWeight: strong ? '700' : '500',
          fontSize: strong ? 18 : 14,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: strong ? theme.colors.primary : theme.colors.onSurface,
          fontWeight: strong ? '700' : '600',
          fontSize: strong ? 20 : 14,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  shellTablet: {
    flexDirection: 'row',
  },
  pane: { flex: 1 },
  filterBlock: {
    flexShrink: 0,
  },
  search: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    elevation: 0,
  },
  tabs: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    minHeight: 44,
  },
  tabButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabButtonLabel: {
    textAlign: 'center',
    lineHeight: 18,
  },
  manualRowTop: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryChips: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    gap: spacing.xs,
  },
  categoryFilterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: spacing.xs,
  },
  categoryChip: {
    marginRight: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  categoryChipText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginVertical: 0,
  },
  productGrid: {
    flex: 1,
  },
  grid: {
    paddingHorizontal: spacing.xs,
  },
  cartPane: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  emptyCartSearch: {
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: radii.button,
    paddingVertical: spacing.sm,
  },
  totals: {
    gap: spacing.xxs,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  discountActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginBottom: spacing.xs,
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
  discountDialogScroll: {
    maxHeight: 420,
    paddingHorizontal: 0,
  },
  linePicker: {
    gap: spacing.xs,
  },
  linePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkoutBtn: {
    borderRadius: radii.md,
  },
  cartBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    elevation: 8,
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '82%',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.sm,
    backgroundColor: Colors.background,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: Colors.border,
    marginBottom: spacing.sm,
  },
  associationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  associationSearch: {
    elevation: 0,
    borderRadius: radii.input,
  },
  snackbarWrapper: {
    bottom: 96,
  },
});
