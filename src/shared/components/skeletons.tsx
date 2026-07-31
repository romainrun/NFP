import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import { ShimmerBlock } from '@/shared/components/Shimmer';
import { radii, spacing } from '@/shared/theme/spacing';

type CountProps = {
  count?: number;
  style?: ViewStyle;
};

function HeaderSkeleton({ withActions = false }: { withActions?: boolean }) {
  return (
    <View style={styles.header}>
      <ShimmerBlock height={28} width="55%" radius={radii.sm} />
      <ShimmerBlock height={16} width="40%" radius={radii.sm} style={{ marginTop: spacing.xs }} />
      {withActions ? (
        <View style={styles.headerActions}>
          <ShimmerBlock height={36} width={88} radius={radii.button} />
          <ShimmerBlock height={36} width={88} radius={radii.button} />
        </View>
      ) : null}
    </View>
  );
}

export function ChipRowSkeleton({ count = 5 }: CountProps) {
  return (
    <View style={styles.chipRow}>
      {Array.from({ length: count }).map((_, index) => (
        <ShimmerBlock
          key={index}
          height={32}
          width={72 + (index % 3) * 16}
          radius={radii.pill}
        />
      ))}
    </View>
  );
}

export function ProductListItemSkeleton() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.productRow,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
      ]}
    >
      <ShimmerBlock height={64} width={64} radius={radii.sm} />
      <View style={styles.productRowMain}>
        <ShimmerBlock height={18} width="70%" radius={radii.sm} />
        <ShimmerBlock height={14} width="50%" radius={radii.sm} />
        <View style={styles.metaRow}>
          <ShimmerBlock height={12} width={56} radius={radii.sm} />
          <ShimmerBlock height={12} width={48} radius={radii.sm} />
        </View>
      </View>
    </View>
  );
}

export function ProductListSkeleton({ count = 6 }: CountProps) {
  return (
    <View style={styles.list}>
      <HeaderSkeleton withActions />
      <ShimmerBlock height={48} radius={radii.input} style={{ marginHorizontal: spacing.md }} />
      <ChipRowSkeleton />
      {Array.from({ length: count }).map((_, index) => (
        <ProductListItemSkeleton key={index} />
      ))}
    </View>
  );
}

export function ProductGridTileSkeleton() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
      ]}
    >
      <ShimmerBlock height={72} radius={radii.sm} />
      <ShimmerBlock height={14} width="90%" radius={radii.sm} />
      <ShimmerBlock height={12} width="60%" radius={radii.sm} />
      <View style={styles.tileFooter}>
        <ShimmerBlock height={16} width={56} radius={radii.sm} />
        <ShimmerBlock height={12} width={48} radius={radii.sm} />
      </View>
    </View>
  );
}

export function ProductGridSkeleton({
  columns = 2,
  rows = 4,
}: {
  columns?: number;
  rows?: number;
}) {
  const count = columns * rows;
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={{ width: `${100 / columns}%` }}>
          <ProductGridTileSkeleton />
        </View>
      ))}
    </View>
  );
}

export function CartLineSkeleton() {
  const theme = useTheme();
  return (
    <View style={[styles.cartLine, { borderColor: theme.colors.outline }]}>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <ShimmerBlock height={16} width="75%" radius={radii.sm} />
        <ShimmerBlock height={12} width="40%" radius={radii.sm} />
      </View>
      <ShimmerBlock height={28} width={72} radius={radii.sm} />
    </View>
  );
}

export function PosSkeleton({ splitLayout = false }: { splitLayout?: boolean }) {
  const catalog = (
    <View style={styles.pane}>
      <HeaderSkeleton withActions />
      <ShimmerBlock height={44} radius={radii.input} style={{ marginHorizontal: spacing.sm }} />
      <ShimmerBlock
        height={48}
        radius={radii.input}
        style={{ marginHorizontal: spacing.sm, marginTop: spacing.sm }}
      />
      <View style={{ marginHorizontal: spacing.sm, marginTop: spacing.sm }}>
        <ShimmerBlock height={40} radius={radii.button} />
      </View>
      <ChipRowSkeleton />
      <ProductGridSkeleton columns={splitLayout ? 3 : 2} rows={3} />
    </View>
  );

  const cart = (
    <View style={styles.cartPane}>
      <ShimmerBlock height={22} width="45%" radius={radii.sm} />
      <CartLineSkeleton />
      <CartLineSkeleton />
      <CartLineSkeleton />
      <ShimmerBlock height={48} radius={radii.button} style={{ marginTop: spacing.md }} />
    </View>
  );

  if (splitLayout) {
    return (
      <View style={styles.posSplit}>
        {catalog}
        {cart}
      </View>
    );
  }

  return (
    <View style={styles.posSingle}>
      {catalog}
      <View style={styles.cartPaneCompact}>
        <ShimmerBlock height={20} width="35%" radius={radii.sm} />
        <ShimmerBlock height={44} radius={radii.button} />
      </View>
    </View>
  );
}

export function DashboardSkeleton() {
  const theme = useTheme();
  return (
    <View style={styles.dashboard}>
      <HeaderSkeleton />
      <ShimmerBlock height={200} radius={radii.xl} />
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { borderColor: theme.colors.outline }]}>
          <ShimmerBlock height={14} width="60%" radius={radii.sm} />
          <ShimmerBlock height={28} width="50%" radius={radii.sm} style={{ marginTop: spacing.sm }} />
        </View>
        <View style={[styles.metricCard, { borderColor: theme.colors.outline }]}>
          <ShimmerBlock height={14} width="60%" radius={radii.sm} />
          <ShimmerBlock height={28} width="50%" radius={radii.sm} style={{ marginTop: spacing.sm }} />
        </View>
      </View>
      <View style={[styles.chartCard, { borderColor: theme.colors.outline }]}>
        <ShimmerBlock height={18} width="40%" radius={radii.sm} />
        <ShimmerBlock height={120} radius={radii.md} style={{ marginTop: spacing.md }} />
      </View>
      <View style={[styles.sidePanel, { borderColor: theme.colors.outline }]}>
        <ShimmerBlock height={18} width="45%" radius={radii.sm} />
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={styles.sideRow}>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <ShimmerBlock height={14} width="70%" radius={radii.sm} />
              <ShimmerBlock height={12} width="40%" radius={radii.sm} />
            </View>
            <ShimmerBlock height={16} width={48} radius={radii.sm} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function CheckoutSkeleton() {
  return (
    <View style={styles.checkout}>
      <View style={styles.checkoutHeader}>
        <ShimmerBlock height={36} width={36} radius={radii.pill} />
        <ShimmerBlock height={24} width="50%" radius={radii.sm} />
      </View>
      <ShimmerBlock height={140} radius={radii.card} />
      <ShimmerBlock height={20} width="45%" radius={radii.sm} style={{ marginTop: spacing.lg }} />
      <View style={styles.methodGrid}>
        {Array.from({ length: 6 }).map((_, index) => (
          <ShimmerBlock key={index} height={88} radius={radii.md} style={{ flex: 1, minWidth: '30%' }} />
        ))}
      </View>
      <ShimmerBlock height={52} radius={radii.button} style={{ marginTop: spacing.lg }} />
    </View>
  );
}

export function SalesHistorySkeleton() {
  return (
    <View style={styles.history}>
      <HeaderSkeleton />
      <ShimmerBlock height={40} radius={radii.button} />
      <ShimmerBlock height={100} radius={radii.card} />
      <ShimmerBlock height={48} radius={radii.input} />
      {Array.from({ length: 5 }).map((_, index) => (
        <View key={index} style={styles.historyRow}>
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <ShimmerBlock height={16} width="35%" radius={radii.sm} />
            <ShimmerBlock height={12} width="55%" radius={radii.sm} />
          </View>
          <ShimmerBlock height={18} width={64} radius={radii.sm} />
        </View>
      ))}
    </View>
  );
}

export function SettingsSkeleton() {
  return (
    <View style={styles.settings}>
      <HeaderSkeleton withActions />
      {Array.from({ length: 3 }).map((_, section) => (
        <View key={section} style={styles.settingsSection}>
          <ShimmerBlock height={20} width="40%" radius={radii.sm} />
          <ShimmerBlock height={48} radius={radii.input} />
          <ShimmerBlock height={48} radius={radii.input} />
          <ShimmerBlock height={48} radius={radii.input} />
        </View>
      ))}
    </View>
  );
}

export function ProductFormSkeleton() {
  return (
    <View style={styles.form}>
      <View style={styles.formHeader}>
        <ShimmerBlock height={36} width={36} radius={radii.pill} />
        <ShimmerBlock height={24} width="55%" radius={radii.sm} />
        <ShimmerBlock height={36} width={96} radius={radii.button} />
      </View>
      <ShimmerBlock height={120} radius={radii.card} />
      <ShimmerBlock height={96} radius={radii.card} />
      {Array.from({ length: 6 }).map((_, index) => (
        <ShimmerBlock key={index} height={48} radius={radii.input} />
      ))}
    </View>
  );
}

export function CashClosingSkeleton() {
  return (
    <View style={styles.closing}>
      <HeaderSkeleton />
      <ShimmerBlock height={120} radius={radii.card} />
      <ShimmerBlock height={48} radius={radii.input} />
      <ShimmerBlock height={48} radius={radii.input} />
      <ShimmerBlock height={80} radius={radii.card} />
    </View>
  );
}

export function ExportsSkeleton() {
  return (
    <View style={styles.exports}>
      <HeaderSkeleton />
      <View style={styles.exportCard}>
        <ShimmerBlock height={20} width="40%" radius={radii.sm} />
        <ShimmerBlock height={14} width="80%" radius={radii.sm} />
        {Array.from({ length: 4 }).map((_, index) => (
          <ShimmerBlock key={index} height={44} radius={radii.button} />
        ))}
      </View>
    </View>
  );
}

export function MemberRowSkeleton() {
  const theme = useTheme();
  return (
    <View style={[styles.memberRow, { borderColor: theme.colors.outline }]}>
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <ShimmerBlock height={18} width="55%" radius={radii.sm} />
        <ShimmerBlock height={14} width="40%" radius={radii.sm} />
        <ShimmerBlock height={12} width="30%" radius={radii.sm} />
      </View>
      <ShimmerBlock height={36} width={72} radius={radii.button} />
    </View>
  );
}

export function MemberListSkeleton({ count = 5 }: CountProps) {
  return (
    <View style={styles.list}>
      <HeaderSkeleton withActions />
      {Array.from({ length: count }).map((_, index) => (
        <MemberRowSkeleton key={index} />
      ))}
    </View>
  );
}

export function CategoryRowSkeleton() {
  const theme = useTheme();
  return (
    <View style={[styles.categoryRow, { borderColor: theme.colors.outline }]}>
      <ShimmerBlock height={32} width={32} radius={radii.pill} />
      <ShimmerBlock height={18} width="50%" radius={radii.sm} style={{ flex: 1 }} />
      <ShimmerBlock height={32} width={64} radius={radii.button} />
    </View>
  );
}

export function CategoryListSkeleton({ count = 6 }: CountProps) {
  return (
    <View style={styles.list}>
      <HeaderSkeleton withActions />
      {Array.from({ length: count }).map((_, index) => (
        <CategoryRowSkeleton key={index} />
      ))}
    </View>
  );
}

export function ReceiptSkeleton() {
  return (
    <View style={styles.receipt}>
      <ShimmerBlock height={14} width="70%" radius={radii.sm} />
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={styles.receiptLine}>
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <ShimmerBlock height={16} width="80%" radius={radii.sm} />
            <ShimmerBlock height={12} width="45%" radius={radii.sm} />
          </View>
          <ShimmerBlock height={16} width={56} radius={radii.sm} />
        </View>
      ))}
      <ShimmerBlock height={24} width="50%" radius={radii.sm} style={{ marginTop: spacing.md }} />
    </View>
  );
}

export function BootstrapSkeleton() {
  return (
    <View style={styles.bootstrap}>
      <ShimmerBlock height={58} width={112} radius={radii.md} />
      <ShimmerBlock height={22} width="55%" radius={radii.sm} style={{ marginTop: spacing.lg }} />
      <ShimmerBlock height={14} width="40%" radius={radii.sm} style={{ marginTop: spacing.sm }} />
      <ShimmerBlock height={4} width="30%" radius={radii.pill} style={{ marginTop: spacing.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  productRow: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  productRowMain: {
    flex: 1,
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    margin: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.xxs,
    minHeight: 168,
  },
  tileFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xxs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xs,
  },
  cartLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pane: {
    flex: 1,
    gap: spacing.xs,
  },
  cartPane: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
    minWidth: 280,
  },
  cartPaneCompact: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  posSplit: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  posSingle: {
    flex: 1,
    gap: spacing.sm,
  },
  dashboard: {
    padding: spacing.md,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  chartCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.md,
  },
  sidePanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  checkout: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  checkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  history: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  settings: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  settingsSection: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  form: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  closing: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  exports: {
    padding: spacing.md,
    gap: spacing.md,
  },
  exportCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.card,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
  },
  receipt: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  receiptLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bootstrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
