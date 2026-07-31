import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  HelperText,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import { hasPermission } from '@/features/authentication/domain/permissions';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import type { ISettingsRepository } from '@/features/settings/data/SettingsRepository';
import type {
  DashboardWidgetId,
  DashboardWidgetSetting,
  DayOpeningHours,
  StoreOpeningHours,
  Weekday,
} from '@/features/settings/domain/types';
import {
  DASHBOARD_WIDGET_LABELS,
  WEEKDAY_LABELS,
  defaultDashboardWidgets,
  defaultOpeningHours,
  formatHourRange,
  type ThemePreference,
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
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const setStoreName = useSettingsStore((s) => s.setStoreName);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);
  const canManage = Boolean(
    session && hasPermission(session.employee.role, 'settings.manage'),
  );

  const [storeName, setLocalStoreName] = useState('');
  const [themePreference, setLocalThemePreference] =
    useState<ThemePreference>('system');
  const [hours, setHours] = useState<StoreOpeningHours>(defaultOpeningHours());
  const [dashboardWidgets, setDashboardWidgets] =
    useState<DashboardWidgetSetting[]>(defaultDashboardWidgets());
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
    setLocalThemePreference(settingsQuery.data.themePreference);
    setHours(settingsQuery.data.openingHours);
    setDashboardWidgets(settingsQuery.data.dashboardWidgets);
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!canManage) throw new Error('Permission refusée');
      const repo = container.resolve<ISettingsRepository>(TOKENS.SettingsRepository);
      const nameResult = await repo.setStoreName(storeName);
      if (!nameResult.ok) throw nameResult.error;
      const themeResult = await repo.setThemePreference(themePreference);
      if (!themeResult.ok) throw themeResult.error;
      const hoursResult = await repo.setOpeningHours(hours);
      if (!hoursResult.ok) throw hoursResult.error;
      const widgetsResult = await repo.setDashboardWidgets(dashboardWidgets);
      if (!widgetsResult.ok) throw widgetsResult.error;
      return { storeName: storeName.trim(), themePreference, hours, dashboardWidgets };
    },
    onSuccess: async (value) => {
      setStoreName(value.storeName);
      setThemePreference(value.themePreference);
      setMessage('Paramètres enregistrés');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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

  const updateWidget = (id: DashboardWidgetId, isEnabled: boolean) => {
    setDashboardWidgets((prev) =>
      prev.map((widget) => (widget.id === id ? { ...widget, isEnabled } : widget)),
    );
  };

  if (!canManage) {
    return (
      <Screen centered>
        <Text style={[typography.h2, { color: theme.colors.onSurface }]}>
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

        <Text style={[typography.h3, { color: theme.colors.onSurface }]}>Magasin</Text>
        <TextInput
          mode="outlined"
          label="Nom du magasin"
          value={storeName}
          onChangeText={setLocalStoreName}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.primary}
          style={{ backgroundColor: theme.colors.surface }}
        />

        <Text style={[typography.h3, { color: theme.colors.onSurface, marginTop: spacing.sm }]}>
          Apparence
        </Text>
        <SegmentedButtons
          value={themePreference}
          onValueChange={(value) => setLocalThemePreference(value as ThemePreference)}
          buttons={[
            { value: 'system', label: 'Système', icon: 'theme-light-dark' },
            { value: 'light', label: 'Clair', icon: 'white-balance-sunny' },
            { value: 'dark', label: 'Sombre', icon: 'weather-night' },
          ]}
        />

        <Text style={[typography.h3, { color: theme.colors.onSurface, marginTop: spacing.sm }]}>
          Tableau de bord
        </Text>
        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
          Choisissez les widgets affichés sur l’accueil.
        </Text>
        <View style={styles.widgetList}>
          {dashboardWidgets.map((widget) => (
            <View
              key={widget.id}
              style={[
                styles.widgetRow,
                shadows.sm,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}
            >
              <Text style={[typography.bodyStrong, { color: theme.colors.onSurface, flex: 1 }]}>
                {DASHBOARD_WIDGET_LABELS[widget.id]}
              </Text>
              <Switch
                value={widget.isEnabled}
                onValueChange={(value) => updateWidget(widget.id, value)}
                color={Colors.primary}
              />
            </View>
          ))}
        </View>

        <Text style={[typography.h3, { color: theme.colors.onSurface, marginTop: spacing.sm }]}>
          Horaires d’ouverture
        </Text>
        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
          Définissez la tranche horaire pour chaque jour (ex. 09h → 19h).
        </Text>

        {hours.map((day) => (
          <View
            key={day.weekday}
            style={[
              styles.dayCard,
              shadows.sm,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
            ]}
          >
            <View style={styles.dayHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>
                  {WEEKDAY_LABELS[day.weekday]}
                </Text>
                <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
                  {formatHourRange(day)}
                </Text>
              </View>
              <View style={styles.switchRow}>
                <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
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
  const theme = useTheme();
  return (
    <View style={{ flex: 1, gap: spacing.xxs }}>
      <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
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
              textColor={selected ? Colors.onPrimary : theme.colors.onSurface}
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
  widgetList: {
    gap: spacing.xs,
  },
  widgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  hourChip: {
    marginRight: spacing.xxs,
    borderRadius: radii.button,
  },
});
