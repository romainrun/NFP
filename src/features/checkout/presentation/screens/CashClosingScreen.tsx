import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import type { ICashClosingRepository } from '@/features/checkout/data/CashClosingRepository';
import type { IOrderRepository } from '@/features/checkout/data/OrderRepository';
import { paymentMethodLabel } from '@/features/payments/domain/paymentMethods';
import { AppHeader } from '@/shared/components/AppHeader';
import { QueryErrorPanel } from '@/shared/components/QueryErrorPanel';
import { Screen } from '@/shared/components/Screen';
import { CashClosingSkeleton } from '@/shared/components/skeletons';
import { Colors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import { eurosToCents, formatMoney, parseEurosInput } from '@/shared/utils/money';
import { buildDayPeriod, presetDay } from '@/shared/utils/salesPeriod';

export function CashClosingScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.employee.id;
  const [openingCash, setOpeningCash] = useState('');
  const [countedCash, setCountedCash] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const period = useMemo(() => buildDayPeriod(presetDay('today')), []);

  const historyQuery = useQuery({
    queryKey: ['cash-closing', period.fromIso, period.toIso],
    queryFn: async () => {
      const repo = container.resolve<IOrderRepository>(TOKENS.OrderRepository);
      const result = await repo.getSalesHistory(period);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const latestClosingQuery = useQuery({
    queryKey: ['cash-closing', 'latest', userId, period.fromIso],
    enabled: Boolean(userId),
    queryFn: async () => {
      const repo = container.resolve<ICashClosingRepository>(TOKENS.CashClosingRepository);
      const result = await repo.getLatestForDay(userId!, period.fromIso);
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !historyQuery.data) throw new Error('Session invalide');
      if (!countedCash.trim()) throw new Error('Comptez les espèces avant clôture');
      const openingCashCents = eurosToCents(parseEurosInput(openingCash) ?? 0);
      const countedCashCents = eurosToCents(parseEurosInput(countedCash) ?? 0);
      const cashTotal =
        historyQuery.data.paymentBreakdown.find((p) => p.method === 'cash')?.totalCents ?? 0;
      const expectedCashCents = openingCashCents + cashTotal;
      const gapCents = countedCashCents - expectedCashCents;
      const repo = container.resolve<ICashClosingRepository>(TOKENS.CashClosingRepository);
      const result = await repo.save({
        userId,
        periodStart: period.fromIso,
        periodEnd: period.toIso,
        openingCashCents,
        countedCashCents,
        expectedCashCents,
        gapCents,
        totalCents: historyQuery.data.totalCents,
        orderCount: historyQuery.data.orderCount,
        paymentBreakdown: historyQuery.data.paymentBreakdown,
        notes: notes.trim() || null,
      });
      if (!result.ok) throw result.error;
      return result.value;
    },
    onSuccess: async () => {
      setMessage('Clôture enregistrée');
      await queryClient.invalidateQueries({ queryKey: ['cash-closing'] });
    },
    onError: (err: Error) => setMessage(err.message),
  });

  if (historyQuery.isError) {
    return (
      <QueryErrorPanel
        message={historyQuery.error?.message}
        onRetry={() => void historyQuery.refetch()}
      />
    );
  }

  if (historyQuery.isLoading && !historyQuery.data) {
    return (
      <Screen padded={false}>
        <CashClosingSkeleton />
      </Screen>
    );
  }

  const snapshot = historyQuery.data;
  const cashTotal =
    snapshot?.paymentBreakdown.find((payment) => payment.method === 'cash')?.totalCents ?? 0;
  const openingCashCents = eurosToCents(parseEurosInput(openingCash) ?? 0);
  const countedCashCents = eurosToCents(parseEurosInput(countedCash) ?? 0);
  const expectedCashCents = openingCashCents + cashTotal;
  const gapCents = countedCash.trim() ? countedCashCents - expectedCashCents : 0;
  const latest = latestClosingQuery.data;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader title="Clôture de caisse" subtitle="Contrôle de fin de journée" />

        {latest ? (
          <HelperText type="info" visible>
            Dernière clôture : {new Date(latest.createdAt).toLocaleTimeString('fr-FR')} · écart{' '}
            {formatMoney(latest.gapCents)}
          </HelperText>
        ) : null}

        <View
          style={[
            styles.card,
            shadows.sm,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
          ]}
        >
          <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
            CA TTC du jour
          </Text>
          <Text style={[typography.amount, { color: Colors.primary }]}>
            {formatMoney(snapshot?.totalCents ?? 0)}
          </Text>
          <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
            {snapshot?.orderCount ?? 0} ticket(s) · TVA {formatMoney(snapshot?.vatCents ?? 0)}
          </Text>
        </View>

        <Text style={[typography.h3, { color: theme.colors.onSurface }]}>
          Moyens de paiement
        </Text>
        <View style={styles.grid}>
          {(snapshot?.paymentBreakdown ?? []).map((payment) => (
            <View
              key={payment.method}
              style={[
                styles.tile,
                shadows.sm,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
              ]}
            >
              <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                {paymentMethodLabel(payment.method)}
              </Text>
              <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>
                {formatMoney(payment.totalCents)}
              </Text>
            </View>
          ))}
        </View>

        <Text style={[typography.h3, { color: theme.colors.onSurface }]}>Espèces</Text>
        <TextInput
          mode="outlined"
          label="Fond de caisse (€)"
          value={openingCash}
          onChangeText={setOpeningCash}
          keyboardType="decimal-pad"
        />
        <TextInput
          mode="outlined"
          label="Espèces comptées (€)"
          value={countedCash}
          onChangeText={setCountedCash}
          keyboardType="decimal-pad"
        />
        <TextInput
          mode="outlined"
          label="Notes (optionnel)"
          value={notes}
          onChangeText={setNotes}
        />

        <View
          style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
        >
          <Row label="Espèces ventes" value={formatMoney(cashTotal)} />
          <Row label="Caisse attendue" value={formatMoney(expectedCashCents)} />
          <Row
            label="Écart"
            value={formatMoney(gapCents)}
            color={gapCents === 0 ? theme.colors.onSurface : theme.colors.error}
          />
        </View>

        {message ? (
          <HelperText type={message.includes('enregistrée') ? 'info' : 'error'} visible>
            {message}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          buttonColor={Colors.primary}
          loading={saveMutation.isPending}
          onPress={() => saveMutation.mutate()}
        >
          Enregistrer la clôture
        </Button>
        <Button mode="outlined" onPress={() => void historyQuery.refetch()}>
          Actualiser ventes
        </Button>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      <Text style={[typography.bodyStrong, { color: color ?? theme.colors.onSurface }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tile: {
    minWidth: '47%',
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
