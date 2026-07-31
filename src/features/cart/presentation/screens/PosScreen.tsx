import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  HelperText,
  IconButton,
  Searchbar,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { ICartRepository } from '@/features/cart/data/CartRepository';
import { BarcodeScannerModal } from '@/features/cart/presentation/components/BarcodeScannerModal';
import { CartLineRow } from '@/features/cart/presentation/components/CartLineRow';
import { useSalesAccess } from '@/features/cart/presentation/hooks/useSalesAccess';
import type { IProductRepository } from '@/features/products/data/ProductRepository';
import type { Product } from '@/features/products/domain/types';
import type { AppStackParamList } from '@/navigation/types';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay';
import { Screen } from '@/shared/components/Screen';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { formatMoney } from '@/shared/utils/money';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = NativeStackScreenProps<AppStackParamList, 'Pos'>;

export function PosScreen({ navigation }: Props) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { useSplitLayout } = useResponsiveLayout();
  const { canSell, userId } = useSalesAccess();
  const [search, setSearch] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

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
    queryKey: ['products', 'pos', search],
    enabled: canSell,
    queryFn: async () => {
      const repo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
      const result = await repo.list({
        search: search.trim() || undefined,
        includeInactive: false,
      });
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
    onError: (error: Error) => setSnack(error.message),
  });

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

  const quickProducts = useMemo(() => {
    const all = productsQuery.data ?? [];
    if (search.trim()) return all;
    const quick = all.filter((p) => p.isQuick || p.isFavorite);
    return quick.length ? quick : all.slice(0, 24);
  }, [productsQuery.data, search]);

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
      <View style={styles.catalogHeader}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.h2, { color: theme.colors.onSurface }]}>Caisse</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Scan, recherche ou produits rapides
          </Text>
        </View>
        <Button mode="contained-tonal" icon="barcode-scan" onPress={() => setScannerOpen(true)}>
          Scanner
        </Button>
      </View>

      <Searchbar
        placeholder="Rechercher un article"
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

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
            if (manualCode.trim()) barcodeMutation.mutate(manualCode.trim());
          }}
          right={
            <TextInput.Icon
              icon="keyboard-return"
              onPress={() => {
                if (manualCode.trim()) barcodeMutation.mutate(manualCode.trim());
              }}
            />
          }
        />
      </View>

      <FlatList
        data={quickProducts}
        keyExtractor={(item) => item.id}
        numColumns={useSplitLayout ? 3 : 2}
        key={useSplitLayout ? 'tablet-grid' : 'phone-grid'}
        contentContainerStyle={styles.grid}
        refreshing={productsQuery.isRefetching}
        onRefresh={() => void productsQuery.refetch()}
        ListEmptyComponent={
          <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
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
        onPress={() => navigation.navigate('Checkout')}
      >
        Encaisser
      </Button>
    </View>
  );

  return (
    <Screen padded={false}>
      <View style={[styles.shell, useSplitLayout && styles.shellTablet]}>
        <View style={{ flex: useSplitLayout ? 1.35 : 1 }}>{catalog}</View>
        <View style={{ flex: useSplitLayout ? 1 : 0.95 }}>{cartPane}</View>
      </View>

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => {
          barcodeMutation.mutate(code);
        }}
      />

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack(null)} duration={1800}>
        {snack}
      </Snackbar>
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
  catalogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  search: {
    marginHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    elevation: 0,
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
});
