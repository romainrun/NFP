import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { HelperText, IconButton, SegmentedButtons, Switch, Text, TextInput } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IAdminSettingsRepository } from '@/features/settings/data/AdminSettingsRepository';
import { paymentMethodLabel } from '@/features/payments/domain/paymentMethods';
import { AdminScreenShell } from '@/features/settings/presentation/components/AdminScreenShell';
import type { PaymentsSettings } from '@/features/settings/domain/adminSettings';
import { useAdminBundle } from '@/features/settings/presentation/hooks/useAdminBundle';
import { logSettingsChange } from '@/shared/services/activity/activityTracker';
import { Colors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import { eurosToCents, formatMoney, parseEurosInput } from '@/shared/utils/money';

export function AdminPaymentsScreen() {
  const queryClient = useQueryClient();
  const bundleQuery = useAdminBundle();
  const [payments, setPayments] = useState<PaymentsSettings | null>(null);
  const [maxCashEuros, setMaxCashEuros] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bundleQuery.data) return;
    setPayments(bundleQuery.data.payments);
    setMaxCashEuros((bundleQuery.data.payments.maxCashCents / 100).toFixed(2));
  }, [bundleQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!payments) throw new Error('Chargement incomplet');
      const maxCashCents = eurosToCents(parseEurosInput(maxCashEuros) ?? 0);
      const admin = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);
      const result = await admin.setPayments({ ...payments, maxCashCents });
      if (!result.ok) throw result.error;
    },
    onSuccess: async () => {
      setError(null);
      await logSettingsChange('Paiements');
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!payments) {
    return (
      <AdminScreenShell title="Paiements" subtitle="Chargement…">
        <View />
      </AdminScreenShell>
    );
  }

  const sorted = [...payments.methods].sort((a, b) => a.sortOrder - b.sortOrder);
  const enabledMethods = sorted.filter((m) => m.enabled).map((m) => m.method);

  const moveMethod = (method: PaymentsSettings['methods'][0]['method'], direction: -1 | 1) => {
    const index = sorted.findIndex((m) => m.method === method);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= sorted.length) return;
    const next = [...payments.methods];
    const a = next.find((m) => m.method === sorted[index]?.method);
    const b = next.find((m) => m.method === sorted[swapIndex]?.method);
    if (!a || !b) return;
    const aOrder = a.sortOrder;
    a.sortOrder = b.sortOrder;
    b.sortOrder = aOrder;
    setPayments({ ...payments, methods: next });
  };

  return (
    <AdminScreenShell
      title="Paiements"
      subtitle="Modes acceptés en caisse"
      onSave={() => saveMutation.mutate()}
      saving={saveMutation.isPending}
    >
      <Text style={typography.h3}>Modes de paiement</Text>
      {sorted.map((item, index) => (
        <View
          key={item.method}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: spacing.xxs,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={typography.body}>{paymentMethodLabel(item.method)}</Text>
          </View>
          <IconButton
            icon="arrow-up"
            disabled={index === 0}
            onPress={() => moveMethod(item.method, -1)}
          />
          <IconButton
            icon="arrow-down"
            disabled={index === sorted.length - 1}
            onPress={() => moveMethod(item.method, 1)}
          />
          <Switch
            value={item.enabled}
            onValueChange={(enabled) => {
              const methods = payments.methods.map((m) =>
                m.method === item.method ? { ...m, enabled } : m,
              );
              setPayments({ ...payments, methods });
            }}
          />
        </View>
      ))}

      <Text style={typography.caption}>Mode par défaut</Text>
      <SegmentedButtons
        value={payments.defaultMethod}
        onValueChange={(v) =>
          setPayments({ ...payments, defaultMethod: v as PaymentsSettings['defaultMethod'] })
        }
        buttons={enabledMethods.map((method) => ({
          value: method,
          label: paymentMethodLabel(method),
        }))}
      />

      <TextInput
        mode="outlined"
        label="Espèces max acceptées (€)"
        value={maxCashEuros}
        onChangeText={setMaxCashEuros}
        keyboardType="decimal-pad"
      />
      <Text style={[typography.caption, { color: Colors.textSecondary }]}>
        Limite actuelle : {formatMoney(eurosToCents(parseEurosInput(maxCashEuros) ?? 0))}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={typography.body}>Paiement mixte</Text>
        <Switch
          value={payments.enableSplitPayment}
          onValueChange={(v) => setPayments({ ...payments, enableSplitPayment: v })}
        />
      </View>

      {error ? (
        <HelperText type="error" visible>{error}</HelperText>
      ) : null}
    </AdminScreenShell>
  );
}
