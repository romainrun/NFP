import { Share, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IOrderRepository } from '@/features/checkout/data/OrderRepository';
import { paymentMethodLabel } from '@/features/payments/domain/paymentMethods';
import type { IProductRepository } from '@/features/products/data/ProductRepository';
import { AppHeader } from '@/shared/components/AppHeader';
import { Screen } from '@/shared/components/Screen';
import { ExportsSkeleton } from '@/shared/components/skeletons';
import { Colors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import { buildDayPeriod, presetDay } from '@/shared/utils/salesPeriod';

function csvEscape(value: unknown): string {
  const raw = String(value ?? '');
  if (/[;"\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function csvLine(values: unknown[]): string {
  return values.map(csvEscape).join(';');
}

export function ExportsScreen() {
  const theme = useTheme();
  const period = buildDayPeriod(presetDay('today'));

  const productsQuery = useQuery({
    queryKey: ['products', 'exports'],
    queryFn: async () => {
      const repo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
      const result = await repo.list({ includeInactive: true });
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const salesQuery = useQuery({
    queryKey: ['sales-history', 'export-today', period.fromIso, period.toIso],
    queryFn: async () => {
      const repo = container.resolve<IOrderRepository>(TOKENS.OrderRepository);
      const result = await repo.getSalesHistory(period);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  if ((productsQuery.isLoading || salesQuery.isLoading) && !productsQuery.data) {
    return (
      <Screen padded={false}>
        <ExportsSkeleton />
      </Screen>
    );
  }

  const shareText = async (title: string, message: string) => {
    await Share.share({ title, message });
  };

  const exportSales = async () => {
    const rows = [
      csvLine(['ticket', 'date', 'total_ttc', 'tva', 'moyens_paiement']),
      ...(salesQuery.data?.orders ?? []).map((order) =>
        csvLine([
          order.receiptNumber,
          order.createdAt,
          order.totalCents / 100,
          order.vatCents / 100,
          order.paymentMethods.map(paymentMethodLabel).join(' + '),
        ]),
      ),
    ];
    await shareText('Export ventes NFP', rows.join('\n'));
  };

  const exportProducts = async () => {
    const rows = [
      csvLine(['sku', 'nom', 'code_barres', 'prix_ttc', 'stock', 'actif']),
      ...(productsQuery.data ?? []).map((product) =>
        csvLine([
          product.sku,
          product.name,
          product.barcode ?? '',
          product.priceCents / 100,
          product.stockQuantity,
          product.isActive ? 'oui' : 'non',
        ]),
      ),
    ];
    await shareText('Export produits NFP', rows.join('\n'));
  };

  const exportStock = async () => {
    const rows = [
      csvLine(['sku', 'nom', 'stock', 'valeur_stock_ttc']),
      ...(productsQuery.data ?? []).map((product) =>
        csvLine([
          product.sku,
          product.name,
          product.stockQuantity,
          (product.stockQuantity * product.priceCents) / 100,
        ]),
      ),
    ];
    await shareText('Export stock NFP', rows.join('\n'));
  };

  const exportBackup = async () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      products: productsQuery.data ?? [],
      salesToday: salesQuery.data ?? null,
    };
    await shareText('Backup NFP JSON', JSON.stringify(payload, null, 2));
  };

  return (
    <Screen padded={false}>
      <View style={styles.content}>
        <AppHeader title="Exports" subtitle="CSV ventes, produits et stock" />
        <View style={[styles.card, shadows.sm, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <Text style={[typography.h3, { color: theme.colors.onSurface }]}>Exports CSV</Text>
          <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
            Les exports sont partagés au format texte CSV (séparateur point-virgule).
          </Text>
          <Button mode="contained" buttonColor={Colors.primary} onPress={exportSales}>
            Export ventes du jour
          </Button>
          <Button mode="outlined" onPress={exportProducts}>
            Export produits
          </Button>
          <Button mode="outlined" onPress={exportStock}>
            Export stock
          </Button>
          <Button mode="outlined" onPress={exportBackup}>
            Backup JSON complet
          </Button>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
});
