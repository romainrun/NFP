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
  ShopInfo,
  StoreOpeningHours,
  Weekday,
} from '@/features/settings/domain/types';
import {
  DASHBOARD_WIDGET_LABELS,
  WEEKDAY_LABELS,
  defaultDashboardWidgets,
  defaultOpeningHours,
  defaultShopInfo,
  formatOpeningHour,
  formatHourRange,
  type ThemePreference,
} from '@/features/settings/domain/types';
import { useSettingsStore } from '@/features/settings/presentation/store/settingsStore';
import { AppHeader } from '@/shared/components/AppHeader';
import { Screen } from '@/shared/components/Screen';
import { SettingsSkeleton } from '@/shared/components/skeletons';
import { Colors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type HourTextState = Record<string, { open: string; close: string }>;

function formatHourInput(value: number): string {
  return formatOpeningHour(value).replace('h', ':');
}

function parseHourInput(raw: string): number | null {
  let normalized = raw.trim().toLowerCase().replace(',', ':').replace('h', ':');
  if (normalized.endsWith(':')) normalized = normalized.slice(0, -1);
  const match = /^(\d{1,2})(?::?(\d{2}))?$/.exec(normalized);
  if (!match) return null;
  const hour = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  if (!Number.isInteger(hour) || !Number.isInteger(minutes)) return null;
  if (hour < 0 || hour > 24 || minutes < 0 || minutes > 59) return null;
  if (hour === 24 && minutes !== 0) return null;
  return hour + minutes / 60;
}

function hourTextsFromHours(hours: StoreOpeningHours): HourTextState {
  return Object.fromEntries(
    hours.map((day) => [
      String(day.weekday),
      { open: formatHourInput(day.openHour), close: formatHourInput(day.closeHour) },
    ]),
  );
}

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
  const [shopInfo, setShopInfo] = useState<ShopInfo>(defaultShopInfo());
  const [themePreference, setLocalThemePreference] =
    useState<ThemePreference>('system');
  const [hours, setHours] = useState<StoreOpeningHours>(defaultOpeningHours());
  const [hourTexts, setHourTexts] = useState<HourTextState>(
    hourTextsFromHours(defaultOpeningHours()),
  );
  const [dashboardWidgets, setDashboardWidgets] =
    useState<DashboardWidgetSetting[]>(defaultDashboardWidgets());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

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
    setShopInfo(settingsQuery.data.shopInfo);
    setLocalThemePreference(settingsQuery.data.themePreference);
    setHours(settingsQuery.data.openingHours);
    setHourTexts(hourTextsFromHours(settingsQuery.data.openingHours));
    setDashboardWidgets(settingsQuery.data.dashboardWidgets);
    setIsSaved(false);
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!canManage) throw new Error('Permission refusée');
      const repo = container.resolve<ISettingsRepository>(TOKENS.SettingsRepository);
      const nameResult = await repo.setStoreName(storeName);
      if (!nameResult.ok) throw nameResult.error;
      const shopResult = await repo.setShopInfo(shopInfo);
      if (!shopResult.ok) throw shopResult.error;
      const themeResult = await repo.setThemePreference(themePreference);
      if (!themeResult.ok) throw themeResult.error;
      const normalizedHours = hours.map((day) => {
        if (day.isClosed) return day;
        const text = hourTexts[String(day.weekday)];
        const openHour = parseHourInput(text?.open ?? '');
        const closeHour = parseHourInput(text?.close ?? '');
        if (openHour == null || closeHour == null) {
          throw new Error(`Horaires invalides pour ${WEEKDAY_LABELS[day.weekday]}`);
        }
        return { ...day, openHour, closeHour };
      });
      const hoursResult = await repo.setOpeningHours(normalizedHours);
      if (!hoursResult.ok) throw hoursResult.error;
      const widgetsResult = await repo.setDashboardWidgets(dashboardWidgets);
      if (!widgetsResult.ok) throw widgetsResult.error;
      return {
        storeName: storeName.trim(),
        themePreference,
        hours: normalizedHours,
        dashboardWidgets,
        shopInfo,
      };
    },
    onSuccess: async (value) => {
      setStoreName(value.storeName);
      setThemePreference(value.themePreference);
      setHours(value.hours);
      setHourTexts(hourTextsFromHours(value.hours));
      setIsSaved(true);
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

  const markDirty = () => setIsSaved(false);

  const updateDay = (weekday: Weekday, patch: Partial<DayOpeningHours>) => {
    markDirty();
    setHours((prev) =>
      prev.map((day) => (day.weekday === weekday ? { ...day, ...patch } : day)),
    );
  };

  const updateHourText = (
    weekday: Weekday,
    field: 'open' | 'close',
    value: string,
  ) => {
    markDirty();
    setHourTexts((prev) => ({
      ...prev,
      [String(weekday)]: {
        ...(prev[String(weekday)] ?? { open: '09:00', close: '19:00' }),
        [field]: value,
      },
    }));
  };

  const updateWidget = (id: DashboardWidgetId, isEnabled: boolean) => {
    markDirty();
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
    return (
      <Screen padded={false}>
        <SettingsSkeleton />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          title="Paramètres"
          subtitle="Magasin et horaires d’ouverture"
          right={
            <Button
              mode="contained"
              compact
              buttonColor={Colors.primary}
              loading={saveMutation.isPending}
              disabled={isSaved || saveMutation.isPending}
              icon={isSaved ? 'check' : undefined}
              onPress={() => saveMutation.mutate()}
            >
              {isSaved ? 'Enregistré' : 'Enregistrer'}
            </Button>
          }
        />

        <Text style={[typography.h3, { color: theme.colors.onSurface }]}>Magasin</Text>
        <TextInput
          mode="outlined"
          label="Nom du magasin"
          value={storeName}
          onChangeText={(value) => {
            markDirty();
            setLocalStoreName(value);
          }}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.primary}
          style={{ backgroundColor: theme.colors.surface }}
        />
        <TextInput
          mode="outlined"
          label="Adresse"
          value={shopInfo.address}
          onChangeText={(address) => {
            markDirty();
            setShopInfo((prev) => ({ ...prev, address }));
          }}
          style={{ backgroundColor: theme.colors.surface }}
        />
        <TextInput
          mode="outlined"
          label="Téléphone"
          value={shopInfo.phone}
          onChangeText={(phone) => {
            markDirty();
            setShopInfo((prev) => ({ ...prev, phone }));
          }}
          keyboardType="phone-pad"
          style={{ backgroundColor: theme.colors.surface }}
        />
        <TextInput
          mode="outlined"
          label="SIRET"
          value={shopInfo.siret}
          onChangeText={(siret) => {
            markDirty();
            setShopInfo((prev) => ({ ...prev, siret }));
          }}
          keyboardType="number-pad"
          style={{ backgroundColor: theme.colors.surface }}
        />

        <Text style={[typography.h3, { color: theme.colors.onSurface, marginTop: spacing.sm }]}>
          Apparence
        </Text>
        <SegmentedButtons
          value={themePreference}
          onValueChange={(value) => {
            markDirty();
            setLocalThemePreference(value as ThemePreference);
          }}
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
          Saisissez simplement les heures, par exemple 09:30, 9h30 ou 19h.
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
              <View style={styles.timeInputs}>
                <TextInput
                  mode="outlined"
                  dense
                  label="Ouverture"
                  value={hourTexts[String(day.weekday)]?.open ?? ''}
                  onChangeText={(value) => updateHourText(day.weekday, 'open', value)}
                  placeholder="09:30"
                  keyboardType="numbers-and-punctuation"
                  style={styles.timeInput}
                />
                <TextInput
                  mode="outlined"
                  dense
                  label="Fermeture"
                  value={hourTexts[String(day.weekday)]?.close ?? ''}
                  onChangeText={(value) => updateHourText(day.weekday, 'close', value)}
                  placeholder="19:00"
                  keyboardType="numbers-and-punctuation"
                  style={styles.timeInput}
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
          disabled={isSaved || saveMutation.isPending}
          icon={isSaved ? 'check' : undefined}
          contentStyle={{ minHeight: 52 }}
          labelStyle={typography.button}
          onPress={() => saveMutation.mutate()}
        >
          {isSaved ? 'Enregistré' : 'Enregistrer'}
        </Button>
      </ScrollView>
    </Screen>
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
  timeInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timeInput: {
    flex: 1,
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
});
