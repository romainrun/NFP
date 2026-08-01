import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import type { IImportExportRepository } from '@/features/products/data/ImportExportRepository';
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

  const exportMutation = useMutation({
    mutationFn: async () => {
      const repo = container.resolve<IImportExportRepository>(TOKENS.ImportExportRepository);
      const result = await repo.exportProductCatalogueCsv();
      if (!result.ok) throw result.error;
    },
    onError: (err: Error) => setError(err.message),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Session invalide');
      const repo = container.resolve<IImportExportRepository>(TOKENS.ImportExportRepository);
      const result = await repo.importProductCatalogueCsv(userId);
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: (result) => {
      if (result?.skipped) return;
      setError(null);
      Alert.alert('Import terminé', `${result.created} créé(s), ${result.updated} mis à jour.`);
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <AdminScreenShell title="Import catalogue" subtitle="Fichiers CSV produits">
      <Text style={[typography.bodyStrong, { marginBottom: spacing.xs }]}>
        Outil de gestion du catalogue uniquement
      </Text>
      <Text style={[typography.caption, { color: Colors.textSecondary, marginBottom: spacing.sm }]}>
        Cette fonctionnalité est destinée à la gestion du catalogue produits. Ce n’est pas un
        système de sauvegarde. Elle ne permet pas d’exporter ou d’importer la base SQLite, les
        ventes, les clients, le stock global ni une archive de sauvegarde.
      </Text>
      <BrandCard style={{ gap: spacing.sm }}>
        <Text style={typography.h3}>Export catalogue (CSV)</Text>
        <Text style={[typography.caption, { color: Colors.textSecondary }]}>
          SKU, nom, code-barres, prix, TVA et stock — pour édition dans Excel puis réimport.
        </Text>
        <Button
          mode="contained"
          icon="download"
          onPress={() => exportMutation.mutate()}
          loading={exportMutation.isPending}
        >
          Exporter le catalogue produits
        </Button>
      </BrandCard>

      <BrandCard style={{ gap: spacing.sm }}>
        <Text style={typography.h3}>Import catalogue (CSV)</Text>
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
