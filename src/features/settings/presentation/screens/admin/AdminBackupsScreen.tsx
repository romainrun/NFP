import { useState } from 'react';
import { Alert, Share, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Button, HelperText, Text } from 'react-native-paper';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import { AdminScreenShell } from '@/features/settings/presentation/components/AdminScreenShell';
import { useAdminBundle } from '@/features/settings/presentation/hooks/useAdminBundle';
import {
  createLocalBackup,
  restoreLocalBackup,
} from '@/features/settings/services/backupService';
import { Colors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

export function AdminBackupsScreen() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const bundleQuery = useAdminBundle();
  const backup = bundleQuery.data?.backup;
  const [error, setError] = useState<string | null>(null);

  const backupMutation = useMutation({
    mutationFn: async () => {
      const result = await createLocalBackup(session?.employee.id);
      const content = await FileSystem.readAsStringAsync(result.path);
      await Share.share({
        title: 'Sauvegarde NFP',
        message: content,
      });
      return result;
    },
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return null;
      const asset = picked.assets[0];
      if (!asset) throw new Error('Fichier introuvable');
      const raw = await FileSystem.readAsStringAsync(asset.uri);
      return restoreLocalBackup(raw, session?.employee.id);
    },
    onSuccess: (result) => {
      if (!result) return;
      setError(null);
      Alert.alert(
        'Restauration terminée',
        `${result.productsRestored} produit(s) restauré(s).`,
      );
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <AdminScreenShell title="Sauvegardes" subtitle="Copie locale du magasin">
      <Text style={[typography.caption, { color: Colors.textSecondary }]}>
        Sauvegarde les produits et informations du magasin sur cet appareil. Une synchronisation
        cloud pourra être ajoutée ultérieurement.
      </Text>

      <Text style={typography.body}>
        Dernière sauvegarde :{' '}
        <Text style={typography.bodyStrong}>
          {backup?.lastBackupAt
            ? format(new Date(backup.lastBackupAt), 'dd/MM/yy HH:mm')
            : 'Aucune'}
        </Text>
      </Text>

      <Button
        mode="contained"
        icon="backup-restore"
        onPress={() => backupMutation.mutate()}
        loading={backupMutation.isPending}
      >
        Sauvegarder maintenant
      </Button>

      <Button
        mode="outlined"
        icon="upload"
        onPress={() => {
          Alert.alert(
            'Restaurer une sauvegarde',
            'Cette action remplace les produits existants selon le fichier. Continuer ?',
            [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Restaurer', style: 'destructive', onPress: () => restoreMutation.mutate() },
            ],
          );
        }}
        loading={restoreMutation.isPending}
      >
        Restaurer une sauvegarde
      </Button>

      {error ? (
        <HelperText type="error" visible>{error}</HelperText>
      ) : null}
    </AdminScreenShell>
  );
}
