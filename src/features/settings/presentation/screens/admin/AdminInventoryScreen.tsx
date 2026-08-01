import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { HelperText, Switch, Text, TextInput } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IAdminSettingsRepository } from '@/features/settings/data/AdminSettingsRepository';
import { AdminScreenShell } from '@/features/settings/presentation/components/AdminScreenShell';
import type { InventorySettings } from '@/features/settings/domain/adminSettings';
import { useAdminBundle } from '@/features/settings/presentation/hooks/useAdminBundle';
import { trackActivity } from '@/shared/services/activity/activityTracker';
import { typography } from '@/shared/theme/typography';

export function AdminInventoryScreen() {
  const queryClient = useQueryClient();
  const bundleQuery = useAdminBundle();
  const [inventory, setInventory] = useState<InventorySettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bundleQuery.data) setInventory(bundleQuery.data.inventory);
  }, [bundleQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!inventory) throw new Error('Chargement incomplet');
      const admin = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);
      const result = await admin.setInventory(inventory);
      if (!result.ok) throw result.error;
    },
    onSuccess: async () => {
      setError(null);
      await trackActivity();
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!inventory) {
    return (
      <AdminScreenShell title="Inventaire" subtitle="Chargement…">
        <View />
      </AdminScreenShell>
    );
  }

  const patch = (partial: Partial<InventorySettings>) =>
    setInventory((prev) => (prev ? { ...prev, ...partial } : prev));

  return (
    <AdminScreenShell
      title="Inventaire"
      subtitle="Seuils et alertes stock"
      onSave={() => saveMutation.mutate()}
      saving={saveMutation.isPending}
    >
      <TextInput
        mode="outlined"
        label="Seuil stock bas"
        value={String(inventory.lowStockThreshold)}
        onChangeText={(v) => {
          const n = Number(v);
          if (Number.isFinite(n) && n >= 0) patch({ lowStockThreshold: Math.round(n) });
        }}
        keyboardType="number-pad"
      />
      <TextInput
        mode="outlined"
        label="Seuil stock critique"
        value={String(inventory.criticalStockThreshold)}
        onChangeText={(v) => {
          const n = Number(v);
          if (Number.isFinite(n) && n >= 0) patch({ criticalStockThreshold: Math.round(n) });
        }}
        keyboardType="number-pad"
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={typography.body}>Alertes stock bas</Text>
        <Switch
          value={inventory.enableLowStockAlerts}
          onValueChange={(v) => patch({ enableLowStockAlerts: v })}
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={typography.body}>Stock négatif autorisé</Text>
        <Switch value={inventory.allowNegativeStock} onValueChange={(v) => patch({ allowNegativeStock: v })} />
      </View>
      {error ? (
        <HelperText type="error" visible>{error}</HelperText>
      ) : null}
    </AdminScreenShell>
  );
}
