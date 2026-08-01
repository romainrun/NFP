import { useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import type { IProductRepository } from '@/features/products/data/ProductRepository';
import { productsToCsv } from '@/features/products/domain/productCsv';
import { importProductsFromCsv } from '@/features/products/services/productImportService';
import { AdminScreenShell } from '@/features/settings/presentation/components/AdminScreenShell';
import { BrandCard } from '@/shared/components/BrandCard';
import { Colors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

export function AdminImportExportScreen() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.employee.id;
  const [error, setError] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ['products', 'import-export'],
    queryFn: async () => {
      const repo = container.resolve<IProductRepository>(TOKENS.ProductRepository);
      const result = await repo.list({ includeInactive: true });
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const products = productsQuery.data ?? [];
      const csv = productsToCsv(products);
      await Share.share({ title: 'Export produits NFP', message: csv });
    },
    onError: (err: Error) => setError(err.message),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Session invalide');
      return importProductsFromCsv(userId);
    },
    onSuccess: (result) => {
      if (result.skipped) return;
      setError(null);
      Alert.alert('Import terminé', `${result.created} créé(s), ${result.updated} mis à jour.`);
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <AdminScreenShell title="Import catalogue" subtitle="Fichiers CSV produits">
      <Text style={[typography.caption, { color: Colors.textSecondary, marginBottom: spacing.sm }]}>
        Le serveur est la source de vérité. L’import/export CSV sert uniquement à préparer ou
        modifier le catalogue produits — pas à sauvegarder ou restaurer la base de données.
      </Text>
      <BrandCard style={{ gap: spacing.sm }}>
        <Text style={typography.h3}>Export produits (CSV)</Text>
        <Text style={[typography.caption, { color: Colors.textSecondary }]}>
          Génère un fichier CSV avec SKU, nom, code-barres, prix, TVA et stock. Idéal pour modifier
          le catalogue dans Excel puis réimporter.
        </Text>
        <Button
          mode="contained"
          icon="download"
          onPress={() => exportMutation.mutate()}
          loading={exportMutation.isPending}
          disabled={!productsQuery.data?.length}
        >
          Exporter les produits
        </Button>
      </BrandCard>

      <BrandCard style={{ gap: spacing.sm }}>
        <Text style={typography.h3}>Import produits (CSV)</Text>
        <Text style={[typography.caption, { color: Colors.textSecondary }]}>
          Met à jour les produits existants (par SKU) ou crée les nouveaux. Colonnes : sku, nom,
          code_barres, prix_ttc, tva, stock.
        </Text>
        <Button
          mode="outlined"
          icon="upload"
          onPress={() => importMutation.mutate()}
          loading={importMutation.isPending}
        >
          Importer un fichier CSV
        </Button>
      </BrandCard>

      {error ? (
        <HelperText type="error" visible>{error}</HelperText>
      ) : null}
    </AdminScreenShell>
  );
}
