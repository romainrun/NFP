import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  HelperText,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import { hasPermission } from '@/features/authentication/domain/permissions';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import type { ISettingsRepository } from '@/features/settings/data/SettingsRepository';
import type { DayOpeningHours, StoreOpeningHours, Weekday } from '@/features/settings/domain/types';
import {
  WEEKDAY_LABELS,
  defaultOpeningHours,
  formatHourRange,
} from '@/features/settings/domain/types';
import { useSettingsStore } from '@/features/settings/presentation/store/settingsStore';
import { AppHeader } from '@/shared/components/AppHeader';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay';
import { Screen } from '@/shared/components/Screen';
import { Colors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => i);

export function SettingsScreen() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const setStoreName = useSettingsStore((s) => s.setStoreName);
  const canManage = Boolean(
    session && hasPermission(session.employee.role, 'settings.manage'),
  );

  const [storeName, setLocalStoreName] = useState('');
  const [hours, setHours] = useState<StoreOpeningHours>(defaultOpeningHours());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const repo = container.resolve<ISettingsRepository>(TOKENS.SettingsRepository);
      const result = await repo.getSettings();
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    setLocalStoreName(settingsQuery.data.storeName);
    setHours(settingsQuery.data.openingHours);
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!canManage) throw new Error('Permission refusée');
      const repo = container.resolve<ISettingsRepository>(TOKENS.SettingsRepository);
      const nameResult = await repo.setStoreName(storeName);
      if (!nameResult.ok) throw nameResult.error;
      const hoursResult = await repo.setOpeningHours(hours);
      if (!hoursResult.ok) throw hoursResult.error;
      return { storeName: storeName.trim(), hours };
    },
    onSuccess: async (value) => {
      setStoreName(value.storeName);
      setMessage('Paramètres enregistrés');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setMessage(null);
    },
  });

  const updateDay = (weekday: Weekday, patch: Partial<DayOpeningHours>) => {
    setHours((prev) =>
      prev.map((day) => (day.weekday === weekday ? { ...day, ...patch } : day)),
    );
  };

  if (!canManage) {
    return (
      <Screen centered>
        <Text style={[typography.h2, { color: Colors.text }]}>
          Accès paramètres réservé
        </Text>
      </Screen>
    );
  }

  if (settingsQuery.isLoading && !settingsQuery.data) {
    return <LoadingOverlay label="Chargement des paramètres…" />;
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader title="Paramètres" subtitle="Magasin et horaires d’ouverture" />

        <Text style={[typography.h3, { color: Colors.text }]}>Magasin</Text>
        <TextInput
          mode="outlined"
          label="Nom du magasin"
          value={storeName}
          onChangeText={setLocalStoreName}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.primary}
          style={{ backgroundColor: Colors.surface }}
        />

        <Text style={[typography.h3, { color: Colors.text, marginTop: spacing.sm }]}>
          Horaires d’ouverture
        </Text>
        <Text style={[typography.caption, { color: Colors.textSecondary }]}>
          Définissez la tranche horaire pour chaque jour (ex. 09h → 19h).
        </Text>

        {hours.map((day) => (
          <View key={day.weekday} style={[styles.dayCard, shadows.sm]}>
            <View style={styles.dayHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: Colors.text }]}>
                  {WEEKDAY_LABELS[day.weekday]}
                </Text>
                <Text style={[typography.caption, { color: Colors.textSecondary }]}>
                  {formatHourRange(day)}
                </Text>
              </View>
              <View style={styles.switchRow}>
                <Text style={[typography.caption, { color: Colors.textSecondary }]}>
                  Ouvert
                </Text>
                <Switch
                  value={!day.isClosed}
                  onValueChange={(open) => updateDay(day.weekday, { isClosed: !open })}
                  color={Colors.primary}
                />
              </View>
            </View>

            {!day.isClosed ? (
              <View style={styles.hourPickers}>
                <HourSelect
                  label="Ouverture"
                  value={day.openHour}
                  options={HOUR_OPTIONS.filter((h) => h < 24)}
                  onChange={(openHour) => updateDay(day.weekday, { openHour })}
                />
                <HourSelect
                  label="Fermeture"
                  value={day.closeHour}
                  options={HOUR_OPTIONS.filter((h) => h >= 1)}
                  onChange={(closeHour) => updateDay(day.weekday, { closeHour })}
                />
              </View>
            ) : null}
          </View>
        ))}

        {error ? (
          <HelperText type="error" visible>
            {error}
          </HelperText>
        ) : null}
        {message ? (
          <HelperText type="info" visible>
            {message}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          buttonColor={Colors.primary}
          loading={saveMutation.isPending}
          contentStyle={{ minHeight: 52 }}
          labelStyle={typography.button}
          onPress={() => saveMutation.mutate()}
        >
          Enregistrer
        </Button>
      </ScrollView>
    </Screen>
  );
}

function HourSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (value: number) => void;
}) {
  return (
    <View style={{ flex: 1, gap: spacing.xxs }}>
      <Text style={[typography.caption, { color: Colors.textSecondary }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((hour) => {
          const selected = hour === value;
          const labelText = hour >= 24 ? '00h' : `${String(hour).padStart(2, '0')}h`;
          return (
            <Button
              key={`${label}-${hour}`}
              mode={selected ? 'contained' : 'outlined'}
              compact
              onPress={() => onChange(hour)}
              style={styles.hourChip}
              buttonColor={selected ? Colors.primary : undefined}
              textColor={selected ? Colors.onPrimary : Colors.text}
            >
              {labelText}
            </Button>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  dayCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  hourPickers: {
    gap: spacing.sm,
  },
  hourChip: {
    marginRight: spacing.xxs,
    borderRadius: radii.button,
  },
});
