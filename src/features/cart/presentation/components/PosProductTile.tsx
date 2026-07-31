import { Image, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { Product } from '@/features/products/domain/types';
import { AnimatedPressable } from '@/shared/components/AnimatedPressable';
import { formatMoney } from '@/shared/utils/money';
import { Colors } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  product: Product;
  promotionBps: number;
  categoryColor: string | null;
  onPress: () => void;
};

export function PosProductTile({ product, promotionBps, categoryColor, onPress }: Props) {
  const theme = useTheme();
  const categoryLabel = product.categoryName ?? 'Sans catégorie';
  const lowStock = product.stockQuantity <= 5;
  const outOfStock = product.stockQuantity <= 0;
  const hasPromotion = promotionBps > 0;

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        styles.tile,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
          opacity: outOfStock ? 0.55 : 1,
        },
      ]}
      scaleTo={0.965}
    >
      <View style={styles.tileImageWrap}>
        {product.imageUri ? (
          <Image source={{ uri: product.imageUri }} style={styles.tileImage} resizeMode="cover" />
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
        {product.isFavorite || product.isQuick ? (
          <View style={styles.tileOverlayTopLeft}>
            {product.isFavorite ? <Text style={styles.tileOverlayIcon}>★</Text> : null}
            {product.isQuick ? <Text style={styles.tileOverlayIcon}>⚡</Text> : null}
          </View>
        ) : null}
        {hasPromotion ? (
          <View style={[styles.tileOverlayTopRight, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.tilePromoText}>-{promotionBps / 100}%</Text>
          </View>
        ) : null}
      </View>
      <Text
        numberOfLines={2}
        style={[typography.caption, { color: theme.colors.onSurface, fontWeight: '600' }]}
      >
        {product.name}
      </Text>
      <View style={styles.tileCategoryLine}>
        <View
          style={[
            styles.categoryDot,
            { backgroundColor: categoryColor ?? theme.colors.outline },
          ]}
        />
        <Text
          numberOfLines={1}
          style={[typography.caption, { color: theme.colors.onSurfaceVariant, fontSize: 11 }]}
        >
          {categoryLabel}
        </Text>
      </View>
      <View style={styles.tileFooter}>
        <Text style={[typography.bodyStrong, { color: theme.colors.primary }]}>
          {formatMoney(product.priceCents)}
        </Text>
        <Text
          style={[
            styles.tileStock,
            {
              color: outOfStock || lowStock ? theme.colors.error : theme.colors.onSurfaceVariant,
            },
          ]}
        >
          Stock {product.stockQuantity}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    margin: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.xxs,
    minHeight: 148,
  },
  tileImageWrap: {
    position: 'relative',
    width: '100%',
    marginBottom: spacing.xxs,
  },
  tileOverlayTopLeft: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tileOverlayTopRight: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tileOverlayIcon: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  tilePromoText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  tileCategoryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  tileImage: {
    width: '100%',
    height: 56,
    borderRadius: radii.sm,
  },
  tilePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileFooter: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  tileStock: {
    fontSize: 10,
    lineHeight: 14,
  },
});
