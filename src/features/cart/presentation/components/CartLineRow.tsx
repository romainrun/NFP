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
};

export function CartLineRow({
  line,
  onIncrement,
  onIncrementFast,
  onDecrement,
  onRemove,
}: Props) {
  const theme = useTheme();
  const hasPromotion = line.discountBps > 0;
  const discountPercent = line.discountBps / 100;
  const originalLineTotalCents = Math.round(line.unitPriceCents * line.quantity);
  const savedCents = Math.max(0, originalLineTotalCents - line.lineTotalCents);

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
      ]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>
          {line.productName}
        </Text>
        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
          {formatMoney(line.unitPriceCents)} · TVA {line.vatRate}%
        </Text>
        {hasPromotion ? (
          <Text style={[typography.caption, { color: theme.colors.primary }]}>
            Promo -{discountPercent}% · avant {formatMoney(originalLineTotalCents)}
            {savedCents > 0 ? ` · économie ${formatMoney(savedCents)}` : ''}
          </Text>
        ) : null}
      </View>

      <View style={styles.qty}>
        <IconButton icon="minus" size={18} onPress={onDecrement} />
        <Text style={[typography.bodyStrong, { color: theme.colors.onSurface, minWidth: 28, textAlign: 'center' }]}>
          {line.quantity}
        </Text>
        <IconButton icon="plus" size={18} onPress={onIncrement} />
        {onIncrementFast ? (
          <IconButton icon="plus-box-multiple-outline" size={18} onPress={onIncrementFast} />
        ) : null}
      </View>

      <Text style={[typography.bodyStrong, { color: theme.colors.primary, minWidth: 72, textAlign: 'right' }]}>
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
  qty: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
