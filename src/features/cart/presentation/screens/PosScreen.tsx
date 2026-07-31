import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Vibration,
  View,
} from 'react-native';
import {
  Button,
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { ICartRepository } from '@/features/cart/data/CartRepository';
import { BarcodeScannerModal } from '@/features/cart/presentation/components/BarcodeScannerModal';
import { CartLineRow } from '@/features/cart/presentation/components/CartLineRow';
import { useSalesAccess } from '@/features/cart/presentation/hooks/useSalesAccess';
import type { IProductRepository } from '@/features/products/data/ProductRepository';
import type { Product } from '@/features/products/domain/types';
import { useCatalogAccess } from '@/features/products/presentation/hooks/useCatalogAccess';
import type { AppStackParamList, MainParamList } from '@/navigation/types';
import { AppHeader } from '@/shared/components/AppHeader';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay';
import { Screen } from '@/shared/components/Screen';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { formatMoney } from '@/shared/utils/money';
import { Colors } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type PosNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<MainParamList, 'Pos'>,
  NativeStackNavigationProp<AppStackParamList>
>;

type CatalogTab = 'top' | 'favorites';

export function PosScreen() {
  const navigation = useNavigation<PosNavigation>();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { useSplitLayout } = useResponsiveLayout();
  const { canSell, userId } = useSalesAccess();
  const { canManage: canManageCatalog, userId: catalogUserId } = useCatalogAccess();
  const [search, setSearch] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const [catalogTab, setCatalogTab] = useState<CatalogTab>('top');
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);

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
    queryKey: ['products', 'pos', search, catalogTab],
    enabled: canSell,
    queryFn: async () => {
      const repo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
      if (search.trim()) {
        const result = await repo.list({
          search: search.trim(),
          includeInactive: false,
        });
        if (!result.ok) throw result.error;
        return result.value;
      }
      if (catalogTab === 'favorites') {
        const result = await repo.list({ includeInactive: false });
        if (!result.ok) throw result.error;
        const favorites = result.value.filter((p) => p.isFavorite || p.isQuick);
        return favorites.length ? favorites : result.value.slice(0, 24);
      }
      const top = await repo.listTopSelling(24);
      if (!top.ok) throw top.error;
      return top.value;
    },
  });

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
    mutationFn: async (productId: string) => {
      const repo = container.resolve<ICartRepository>(TOKENS.CartRepository);
      const result = await repo.addProduct(userId!, productId, 1);
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: async (cart) => {
      queryClient.setQueryData(['cart', userId], cart);
      setSnack('Article ajouté');
    },
    onError: (error: Error) => setSnack(error.message),
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
      barcodeMutation.mutate(barcode);
    },
    onError: (error: Error) => setSnack(error.message),
  });

  const barcodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const repo = container.resolve<ICartRepository>(TOKENS.CartRepository);
      // Try barcode first, then SKU.
      const byBarcode = await repo.addByBarcode(userId!, code, 1);
      if (byBarcode.ok) return byBarcode.value;
      const bySku = await repo.addBySku(userId!, code, 1);
      if (bySku.ok) return bySku.value;
      throw byBarcode.error;
    },
    onSuccess: async (cart) => {
      queryClient.setQueryData(['cart', userId], cart);
      setManualCode('');
      setSnack('Article scanné');
    },
    onError: (error: Error, code) => {
      if (canManageCatalog) {
        setUnknownBarcode(code);
        return;
      }
      setSnack(error.message);
    },
  });

  const scanBarcode = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;
    Vibration.vibrate(80);
    barcodeMutation.mutate(code);
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

  const gridProducts = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

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

  if (cartQuery.isLoading || !cartQuery.data) {
    return <LoadingOverlay label="Ouverture de la caisse…" />;
  }

  const cart = cartQuery.data;

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

      <Searchbar
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
            { value: 'top', label: 'Plus vendus', icon: 'fire' },
            { value: 'favorites', label: 'Favoris', icon: 'star' },
          ]}
          style={styles.tabs}
        />
      ) : null}

      <View style={styles.manualRow}>
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

      <FlatList
        data={gridProducts}
        keyExtractor={(item) => item.id}
        numColumns={useSplitLayout ? 3 : 2}
        key={`${useSplitLayout ? 'tablet' : 'phone'}-${catalogTab}`}
        contentContainerStyle={styles.grid}
        refreshing={productsQuery.isRefetching}
        onRefresh={() => void productsQuery.refetch()}
        ListEmptyComponent={
          <Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>
            Aucun article trouvé
          </Text>
        }
        renderItem={({ item }) => (
          <ProductTile
            product={item}
            onPress={() => addMutation.mutate(item.id)}
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
          <HelperText type="info" visible>
            Scannez ou touchez un article pour commencer.
          </HelperText>
        }
        renderItem={({ item }) => (
          <CartLineRow
            line={item}
            onIncrement={() =>
              qtyMutation.mutate({ lineId: item.id, quantity: item.quantity + 1 })
            }
            onDecrement={() =>
              qtyMutation.mutate({ lineId: item.id, quantity: item.quantity - 1 })
            }
            onRemove={() => qtyMutation.mutate({ lineId: item.id, quantity: 0 })}
          />
        )}
      />

      <View style={styles.totals}>
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
          <Pressable
            onPress={() => setCartSheetOpen(true)}
            style={[styles.cartBar, { backgroundColor: theme.colors.surface }]}
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
          </Pressable>

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

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(null)} duration={1800}>
        {snack}
      </Snackbar>

      <Portal>
        <Dialog
          visible={Boolean(unknownBarcode)}
          onDismiss={() => setUnknownBarcode(null)}
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
                navigation.navigate('ProductForm', { initialBarcode: barcode ?? undefined });
              }}
            >
              Créer un article avec ce code
            </Button>
            <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
              Ou associer ce code à un article existant :
            </Text>
            <FlatList
              data={(barcodeProductsQuery.data ?? []).slice(0, 12)}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 260 }}
              ListEmptyComponent={
                <HelperText type="info" visible>
                  Aucun article disponible.
                </HelperText>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => associateBarcodeMutation.mutate(item)}
                  style={[styles.associationRow, { borderColor: theme.colors.outline }]}
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
                </Pressable>
              )}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setUnknownBarcode(null)}>Fermer</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

function ProductTile({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {product.imageUri ? (
        <Image source={{ uri: product.imageUri }} style={styles.tileImage} />
      ) : (
        <View
          style={[
            styles.tileImage,
            styles.tilePlaceholder,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            {product.name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}
      <Text
        numberOfLines={2}
        style={[typography.caption, { color: theme.colors.onSurface, fontWeight: '600' }]}
      >
        {product.name}
      </Text>
      <Text style={[typography.bodyStrong, { color: theme.colors.primary }]}>
        {formatMoney(product.priceCents)}
      </Text>
    </Pressable>
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
  search: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    elevation: 0,
  },
  tabs: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  manualRow: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  grid: {
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xl,
  },
  tile: {
    flex: 1,
    margin: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.xxs,
    minHeight: 140,
  },
  tileImage: {
    width: '100%',
    height: 64,
    borderRadius: radii.sm,
  },
  tilePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
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
  totals: {
    gap: spacing.xxs,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
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
    bottom: spacing.md,
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
});
