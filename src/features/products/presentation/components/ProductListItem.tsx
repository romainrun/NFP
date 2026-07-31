import { Image, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { Product } from '@/features/products/domain/types';
import { AnimatedPressable } from '@/shared/components/AnimatedPressable';
import { formatMoney } from '@/shared/utils/money';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  product: Product;
  onPress: (product: Product) => void;
};

export function ProductListItem({ product, onPress }: Props) {
  const theme = useTheme();
  const lowStock = product.stockQuantity <= 5;

  return (
    <AnimatedPressable
      onPress={() => onPress(product)}
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
          opacity: product.isActive ? 1 : 0.55,
        },
      ]}
      scaleTo={0.985}
    >
      {product.imageUri ? (
        <Image source={{ uri: product.imageUri }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View
          style={[
            styles.thumb,
            styles.thumbPlaceholder,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
            —
          </Text>
        </View>
      )}

      <View style={styles.main}>
        <View style={styles.titleRow}>
          <Text style={[typography.bodyStrong, { color: theme.colors.onSurface, flex: 1 }]}>
            {product.name}
          </Text>
          <Text style={[typography.bodyStrong, { color: theme.colors.primary }]}>
            {formatMoney(product.priceCents)}
          </Text>
        </View>
        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
          {product.sku}
          {product.categoryName ? ` · ${product.categoryName}` : ''}
          {product.barcode ? ` · ${product.barcode}` : ''}
        </Text>
        <View style={styles.meta}>
          <Text
            style={[
              typography.caption,
              { color: lowStock ? theme.colors.error : theme.colors.onSurfaceVariant },
            ]}
          >
            Stock {product.stockQuantity}
          </Text>
          <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
            TVA {product.vatRate}%
          </Text>
          {product.isFavorite ? (
            <Text style={[typography.caption, { color: theme.colors.primary }]}>Favori</Text>
          ) : null}
          {product.isQuick ? (
            <Text style={[typography.caption, { color: theme.colors.tertiary }]}>Rapide</Text>
          ) : null}
          {!product.isActive ? (
            <Text style={[typography.caption, { color: theme.colors.error }]}>Inactif</Text>
          ) : null}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radii.sm,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { flex: 1, gap: spacing.xxs },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
});
