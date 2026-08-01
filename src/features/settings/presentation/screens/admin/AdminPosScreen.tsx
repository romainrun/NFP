import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { HelperText, Switch, Text, TextInput } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IAdminSettingsRepository } from '@/features/settings/data/AdminSettingsRepository';
import { AdminScreenShell } from '@/features/settings/presentation/components/AdminScreenShell';
import type { PosSettings } from '@/features/settings/domain/adminSettings';
import { useAdminBundle } from '@/features/settings/presentation/hooks/useAdminBundle';
import { trackActivity } from '@/shared/services/activity/activityTracker';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

export function AdminPosScreen() {
  const queryClient = useQueryClient();
  const bundleQuery = useAdminBundle();
  const [pos, setPos] = useState<PosSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bundleQuery.data) setPos(bundleQuery.data.pos);
  }, [bundleQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!pos) throw new Error('Chargement incomplet');
      const admin = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);
      const result = await admin.setPos(pos);
      if (!result.ok) throw result.error;
    },
    onSuccess: async () => {
      setError(null);
      await trackActivity();
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!pos) {
    return (
      <AdminScreenShell title="Caisse" subtitle="Chargement…">
        <View />
      </AdminScreenShell>
    );
  }

  const patch = (partial: Partial<PosSettings>) =>
    setPos((prev) => (prev ? { ...prev, ...partial } : prev));

  return (
    <AdminScreenShell
      title="Caisse"
      subtitle="Paramètres du point de vente"
      onSave={() => saveMutation.mutate()}
      saving={saveMutation.isPending}
    >
      <TextInput mode="outlined" label="Nom de la caisse" value={pos.posName} onChangeText={(v) => patch({ posName: v })} />
      <TextInput mode="outlined" label="Nom de l’appareil" value={pos.deviceName} onChangeText={(v) => patch({ deviceName: v })} />
      <TextInput
        mode="outlined"
        label="N° ticket initial"
        value={String(pos.startingReceiptNumber)}
        onChangeText={(v) => {
          const n = Number(v);
          if (Number.isFinite(n) && n >= 0) patch({ startingReceiptNumber: Math.round(n) });
        }}
        keyboardType="number-pad"
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={typography.body}>Impression auto du ticket</Text>
        <Switch value={pos.autoPrintReceipt} onValueChange={(v) => patch({ autoPrintReceipt: v })} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={typography.body}>Confirmer avant vider le panier</Text>
        <Switch value={pos.confirmBeforeClearCart} onValueChange={(v) => patch({ confirmBeforeClearCart: v })} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={typography.body}>Confirmer avant annuler une vente</Text>
        <Switch value={pos.confirmBeforeVoidSale} onValueChange={(v) => patch({ confirmBeforeVoidSale: v })} />
      </View>
      <TextInput
        mode="outlined"
        label="Verrouillage auto (minutes)"
        value={String(pos.autoLockMinutes)}
        onChangeText={(v) => {
          const n = Number(v);
          if (Number.isFinite(n) && n > 0) patch({ autoLockMinutes: Math.round(n) });
        }}
        keyboardType="number-pad"
      />
      {error ? (
        <HelperText type="error" visible>{error}</HelperText>
      ) : null}
    </AdminScreenShell>
  );
}
