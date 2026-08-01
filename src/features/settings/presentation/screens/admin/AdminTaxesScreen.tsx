import { useEffect, useState } from 'react';
import { View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { Button, HelperText, IconButton, SegmentedButtons, Switch, Text, TextInput } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IAdminSettingsRepository } from '@/features/settings/data/AdminSettingsRepository';
import { AdminScreenShell } from '@/features/settings/presentation/components/AdminScreenShell';
import type { TaxSettings, VatRateConfig } from '@/features/settings/domain/adminSettings';
import { useAdminBundle } from '@/features/settings/presentation/hooks/useAdminBundle';
import { trackActivity } from '@/shared/services/activity/activityTracker';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

export function AdminTaxesScreen() {
  const queryClient = useQueryClient();
  const bundleQuery = useAdminBundle();
  const [taxes, setTaxes] = useState<TaxSettings | null>(null);
  const [newRate, setNewRate] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bundleQuery.data) setTaxes(bundleQuery.data.taxes);
  }, [bundleQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!taxes) throw new Error('Chargement incomplet');
      const admin = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);
      const result = await admin.setTaxes(taxes);
      if (!result.ok) throw result.error;
    },
    onSuccess: async () => {
      setError(null);
      await trackActivity();
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!taxes) {
    return (
      <AdminScreenShell title="Taxes" subtitle="Chargement…">
        <View />
      </AdminScreenShell>
    );
  }

  const addRate = () => {
    const rate = Number(newRate.replace(',', '.'));
    if (!Number.isFinite(rate) || rate < 0) {
      setError('Taux invalide');
      return;
    }
    const id = `vat-${Crypto.randomUUID().slice(0, 8)}`;
    const label = newLabel.trim() || `${rate} %`;
    const entry: VatRateConfig = { id, label, rate, isActive: true };
    setTaxes({
      rates: [...taxes.rates, entry],
      defaultRateId: taxes.defaultRateId || id,
    });
    setNewRate('');
    setNewLabel('');
    setError(null);
  };

  const updateRate = (id: string, partial: Partial<VatRateConfig>) => {
    setTaxes({
      ...taxes,
      rates: taxes.rates.map((r) => (r.id === id ? { ...r, ...partial } : r)),
    });
  };

  return (
    <AdminScreenShell
      title="Taxes"
      subtitle="Taux de TVA"
      onSave={() => saveMutation.mutate()}
      saving={saveMutation.isPending}
    >
      <Text style={typography.caption}>Taux par défaut</Text>
      <SegmentedButtons
        value={taxes.defaultRateId}
        onValueChange={(v) => setTaxes({ ...taxes, defaultRateId: v })}
        buttons={taxes.rates
          .filter((r) => r.isActive)
          .map((r) => ({ value: r.id, label: r.label }))}
      />

      {taxes.rates.map((rate) => (
        <View key={rate.id} style={{ gap: spacing.xs, marginTop: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <TextInput
              mode="outlined"
              label="Libellé"
              value={rate.label}
              onChangeText={(v) => updateRate(rate.id, { label: v })}
              style={{ flex: 1 }}
            />
            <TextInput
              mode="outlined"
              label="Taux %"
              value={String(rate.rate)}
              onChangeText={(v) => {
                const n = Number(v.replace(',', '.'));
                if (Number.isFinite(n)) updateRate(rate.id, { rate: n });
              }}
              keyboardType="decimal-pad"
              style={{ width: 100 }}
            />
            <Switch
              value={rate.isActive}
              onValueChange={(v) => updateRate(rate.id, { isActive: v })}
            />
          </View>
        </View>
      ))}

      <Text style={[typography.h3, { marginTop: spacing.md }]}>Nouveau taux</Text>
      <TextInput mode="outlined" label="Libellé (optionnel)" value={newLabel} onChangeText={setNewLabel} />
      <TextInput
        mode="outlined"
        label="Taux %"
        value={newRate}
        onChangeText={setNewRate}
        keyboardType="decimal-pad"
      />
      <Button mode="outlined" onPress={addRate}>Ajouter un taux</Button>

      {error ? (
        <HelperText type="error" visible>{error}</HelperText>
      ) : null}
    </AdminScreenShell>
  );
}
