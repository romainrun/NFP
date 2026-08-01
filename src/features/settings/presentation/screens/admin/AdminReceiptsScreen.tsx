import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { HelperText, Switch, Text, TextInput } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IAdminSettingsRepository } from '@/features/settings/data/AdminSettingsRepository';
import { AdminScreenShell } from '@/features/settings/presentation/components/AdminScreenShell';
import { LogoImageField } from '@/features/settings/presentation/components/LogoImageField';
import type { ReceiptSettings } from '@/features/settings/domain/adminSettings';
import { useAdminBundle } from '@/features/settings/presentation/hooks/useAdminBundle';
import { trackActivity } from '@/shared/services/activity/activityTracker';
import { typography } from '@/shared/theme/typography';

export function AdminReceiptsScreen() {
  const queryClient = useQueryClient();
  const bundleQuery = useAdminBundle();
  const [receipt, setReceipt] = useState<ReceiptSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bundleQuery.data) setReceipt(bundleQuery.data.receipt);
  }, [bundleQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!receipt) throw new Error('Chargement incomplet');
      const admin = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);
      const result = await admin.setReceipt(receipt);
      if (!result.ok) throw result.error;
    },
    onSuccess: async () => {
      setError(null);
      await trackActivity();
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!receipt) {
    return (
      <AdminScreenShell title="Tickets" subtitle="Chargement…">
        <View />
      </AdminScreenShell>
    );
  }

  const patch = (partial: Partial<ReceiptSettings>) =>
    setReceipt((prev) => (prev ? { ...prev, ...partial } : prev));

  return (
    <AdminScreenShell
      title="Tickets"
      subtitle="Mise en page des tickets"
      onSave={() => saveMutation.mutate()}
      saving={saveMutation.isPending}
    >
      <LogoImageField
        label="Logo ticket"
        imageUri={receipt.logoUri}
        onChange={(uri) => patch({ logoUri: uri })}
      />
      <TextInput
        mode="outlined"
        label="Texte d’en-tête"
        value={receipt.headerText}
        onChangeText={(v) => patch({ headerText: v })}
        multiline
      />
      <TextInput
        mode="outlined"
        label="Texte de pied"
        value={receipt.footerText}
        onChangeText={(v) => patch({ footerText: v })}
        multiline
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={typography.body}>QR code sur le ticket</Text>
        <Switch value={receipt.qrCodeEnabled} onValueChange={(v) => patch({ qrCodeEnabled: v })} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={typography.body}>Numérotation des tickets</Text>
        <Switch value={receipt.numberingEnabled} onValueChange={(v) => patch({ numberingEnabled: v })} />
      </View>
      {error ? (
        <HelperText type="error" visible>{error}</HelperText>
      ) : null}
    </AdminScreenShell>
  );
}
