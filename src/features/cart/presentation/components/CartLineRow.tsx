import { StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import type { CartLine } from '@/features/cart/domain/types';
import { formatMoney } from '@/shared/utils/money';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  line: CartLine;
  onIncrement: () => void;
  onIncrementFast?: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  /** Phone / portrait cart sheet — details on two lines. */
  compact?: boolean;
};

export function CartLineRow({
  line,
  onIncrement,
  onIncrementFast,
  onDecrement,
  onRemove,
  compact = false,
}: Props) {
  const theme = useTheme();
  const hasPromotion = line.discountBps > 0;
  const discountPercent = line.discountBps / 100;
  const originalLineTotalCents = Math.round(line.unitPriceCents * line.quantity);
  const savedCents = Math.max(0, originalLineTotalCents - line.lineTotalCents);

  const metaParts = [
    formatMoney(line.unitPriceCents),
    `TVA ${line.vatRate}%`,
    hasPromotion ? `Promo -${discountPercent}%` : null,
  ].filter(Boolean);

  const promoDetail =
    hasPromotion && savedCents > 0
      ? `avant ${formatMoney(originalLineTotalCents)} · économie ${formatMoney(savedCents)}`
      : hasPromotion
        ? `avant ${formatMoney(originalLineTotalCents)}`
        : null;

  if (compact) {
    return (
      <View
        style={[
          styles.rowCompact,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
        ]}
      >
        <View style={styles.compactHeader}>
          <Text
            numberOfLines={2}
            style={[typography.bodyStrong, styles.compactName, { color: theme.colors.onSurface }]}
          >
            {line.productName}
          </Text>
          <Text
            style={[
              typography.bodyStrong,
              styles.compactTotal,
              { color: theme.colors.primary },
            ]}
          >
            {formatMoney(line.lineTotalCents)}
          </Text>
          <IconButton icon="close" size={18} onPress={onRemove} style={styles.compactRemove} />
        </View>

        <Text
          numberOfLines={2}
          style={[typography.caption, styles.compactMeta, { color: theme.colors.onSurfaceVariant }]}
        >
          {metaParts.join(' · ')}
        </Text>
        {promoDetail ? (
          <Text
            numberOfLines={2}
            style={[typography.caption, styles.compactPromo, { color: theme.colors.primary }]}
          >
            {promoDetail}
          </Text>
        ) : null}

        <View style={styles.compactQtyRow}>
          <View style={styles.qty}>
            <IconButton icon="minus" size={18} onPress={onDecrement} />
            <Text
              style={[
                typography.bodyStrong,
                { color: theme.colors.onSurface, minWidth: 28, textAlign: 'center' },
              ]}
            >
              {line.quantity}
            </Text>
            <IconButton icon="plus" size={18} onPress={onIncrement} />
            {onIncrementFast ? (
              <IconButton icon="plus-box-multiple-outline" size={18} onPress={onIncrementFast} />
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
      ]}
    >
      <View style={styles.wideInfo}>
        <Text
          numberOfLines={1}
          style={[typography.bodyStrong, { color: theme.colors.onSurface }]}
        >
          {line.productName}
        </Text>
        <Text
          numberOfLines={1}
          style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}
        >
          {metaParts.join(' · ')}
          {promoDetail ? ` · ${promoDetail}` : ''}
        </Text>
      </View>

      <View style={styles.qty}>
        <IconButton icon="minus" size={18} onPress={onDecrement} />
        <Text
          style={[
            typography.bodyStrong,
            { color: theme.colors.onSurface, minWidth: 28, textAlign: 'center' },
          ]}
        >
          {line.quantity}
        </Text>
        <IconButton icon="plus" size={18} onPress={onIncrement} />
        {onIncrementFast ? (
          <IconButton icon="plus-box-multiple-outline" size={18} onPress={onIncrementFast} />
        ) : null}
      </View>

      <Text
        style={[
          typography.bodyStrong,
          { color: theme.colors.primary, minWidth: 72, textAlign: 'right' },
        ]}
      >
        {formatMoney(line.lineTotalCents)}
      </Text>
      <IconButton icon="close" size={18} onPress={onRemove} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.xxs,
  },
  wideInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowCompact: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.xxs,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  compactName: {
    flex: 1,
    minWidth: 0,
  },
  compactTotal: {
    textAlign: 'right',
    minWidth: 64,
  },
  compactRemove: {
    margin: 0,
    marginTop: -6,
    marginRight: -6,
  },
  compactMeta: {
    lineHeight: 18,
  },
  compactPromo: {
    lineHeight: 18,
  },
  compactQtyRow: {
    marginTop: spacing.xxs,
  },
  qty: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
