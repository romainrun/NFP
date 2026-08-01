import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { HelperText, SegmentedButtons, Switch, TextInput } from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IAdminSettingsRepository } from '@/features/settings/data/AdminSettingsRepository';
import type { ISettingsRepository } from '@/features/settings/data/SettingsRepository';
import { AdminScreenShell } from '@/features/settings/presentation/components/AdminScreenShell';
import { LogoImageField } from '@/features/settings/presentation/components/LogoImageField';
import type { StoreExtendedSettings } from '@/features/settings/domain/adminSettings';
import { logSettingsChange } from '@/shared/services/activity/activityTracker';
import { spacing } from '@/shared/theme/spacing';

export function AdminStoreScreen() {
  const queryClient = useQueryClient();
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [siret, setSiret] = useState('');
  const [extended, setExtended] = useState<StoreExtendedSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'store'],
    queryFn: async () => {
      const settings = container.resolve<ISettingsRepository>(TOKENS.SettingsRepository);
      const admin = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);
      const base = await settings.getSettings();
      const bundle = await admin.getBundle();
      if (!base.ok) throw base.error;
      if (!bundle.ok) throw bundle.error;
      return { base: base.value, extended: bundle.value.storeExtended };
    },
  });

  useEffect(() => {
    if (!query.data) return;
    setStoreName(query.data.base.storeName);
    setAddress(query.data.base.shopInfo.address);
    setPhone(query.data.base.shopInfo.phone);
    setSiret(query.data.base.shopInfo.siret);
    setExtended(query.data.extended);
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!extended) throw new Error('Chargement incomplet');
      const settings = container.resolve<ISettingsRepository>(TOKENS.SettingsRepository);
      const admin = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);
      const nameResult = await settings.setStoreName(storeName);
      if (!nameResult.ok) throw nameResult.error;
      const shopResult = await settings.setShopInfo({ address, phone, siret });
      if (!shopResult.ok) throw shopResult.error;
      const extResult = await admin.setStoreExtended(extended);
      if (!extResult.ok) throw extResult.error;
    },
    onSuccess: async () => {
      setError(null);
      await logSettingsChange('Magasin');
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!extended) {
    return (
      <AdminScreenShell title="Magasin" subtitle="Chargement…">
        <View />
      </AdminScreenShell>
    );
  }

  const patch = (partial: Partial<StoreExtendedSettings>) =>
    setExtended((prev) => (prev ? { ...prev, ...partial } : prev));

  return (
    <AdminScreenShell
      title="Magasin"
      subtitle="Informations Naturally Forme"
      onSave={() => saveMutation.mutate()}
      saving={saveMutation.isPending}
    >
      <LogoImageField
        label="Logo du magasin"
        imageUri={extended.logoUri}
        onChange={(uri) => patch({ logoUri: uri })}
      />
      <TextInput mode="outlined" label="Nom du magasin" value={storeName} onChangeText={setStoreName} />
      <TextInput mode="outlined" label="Adresse" value={address} onChangeText={setAddress} />
      <TextInput mode="outlined" label="Téléphone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextInput mode="outlined" label="SIRET" value={siret} onChangeText={setSiret} />
      <TextInput mode="outlined" label="Email" value={extended.email} onChangeText={(v) => patch({ email: v })} />
      <TextInput mode="outlined" label="Site web" value={extended.website} onChangeText={(v) => patch({ website: v })} />
      <TextInput mode="outlined" label="N° TVA" value={extended.vatNumber} onChangeText={(v) => patch({ vatNumber: v })} />
      <SegmentedButtons
        value={extended.currency}
        onValueChange={(v) => patch({ currency: v })}
        buttons={[{ value: 'EUR', label: 'EUR' }]}
      />
      <TextInput mode="outlined" label="Fuseau horaire" value={extended.timezone} onChangeText={(v) => patch({ timezone: v })} />
      <SegmentedButtons
        value={extended.language}
        onValueChange={(v) => patch({ language: v })}
        buttons={[{ value: 'fr', label: 'Français' }]}
      />
      <TextInput mode="outlined" label="Latitude" value={extended.latitude} onChangeText={(v) => patch({ latitude: v })} />
      <TextInput mode="outlined" label="Longitude" value={extended.longitude} onChangeText={(v) => patch({ longitude: v })} />
      <TextInput
        mode="outlined"
        label="Pied de ticket"
        value={extended.receiptFooterText}
        onChangeText={(v) => patch({ receiptFooterText: v })}
        multiline
      />
      <TextInput
        mode="outlined"
        label="Politique de retour"
        value={extended.returnPolicy}
        onChangeText={(v) => patch({ returnPolicy: v })}
        multiline
      />
      {error ? (
        <HelperText type="error" visible>{error}</HelperText>
      ) : null}
    </AdminScreenShell>
  );
}
