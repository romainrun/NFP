import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { APP_CONFIG } from '@/core/config/appConfig';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IAuthRepository } from '@/features/authentication/data/AuthRepository';
import type { Employee } from '@/features/authentication/domain/types';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import { PinPad } from '@/shared/components/PinPad';
import { Screen } from '@/shared/components/Screen';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { radii, spacing, touchTarget } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

export function PinLoginScreen() {
  const theme = useTheme();
  const { useSplitLayout } = useResponsiveLayout();
  const { loginWithPin, isSubmitting, errorMessage, clearError } = useAuth();
  const [selected, setSelected] = useState<Employee | null>(null);
  const [pin, setPin] = useState('');

  const authRepo = useMemo(
    () => container.resolve<IAuthRepository>(TOKENS.AuthRepository),
    [],
  );

  const employeesQuery = useQuery({
    queryKey: ['employees', 'active'],
    queryFn: async () => {
      const result = await authRepo.listActiveEmployees();
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  useEffect(() => {
    if (!selected || pin.length !== APP_CONFIG.pinLength || isSubmitting) return;

    void (async () => {
      const success = await loginWithPin(selected.employeeCode, pin);
      if (!success) {
        setPin('');
      }
    })();
  }, [pin, selected, isSubmitting, loginWithPin]);

  const onSelectEmployee = (employee: Employee) => {
    clearError();
    setSelected(employee);
    setPin('');
  };

  const skipPinLogin = async () => {
    clearError();
    const employee =
      selected ??
      employeesQuery.data?.find((item) => item.employeeCode === 'ADMIN') ??
      employeesQuery.data?.[0];

    if (!employee || isSubmitting) return;

    setSelected(employee);
    await loginWithPin(employee.employeeCode, APP_CONFIG.devPin);
  };

  const employeeList = (
    <Animated.View entering={FadeInDown.duration(420)} style={styles.listPane}>
      <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
        Sélectionnez un collaborateur
      </Text>
      <FlatList
        data={employeesQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const active = selected?.id === item.id;
          return (
            <Pressable
              onPress={() => onSelectEmployee(item)}
              style={({ pressed }) => [
                styles.employeeRow,
                {
                  backgroundColor: active
                    ? theme.colors.primaryContainer
                    : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.outline,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View>
                <Text style={[typography.bodyStrong, { color: theme.colors.onSurface }]}>
                  {item.displayName}
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  {item.employeeCode} · {item.role}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Aucun employé actif.
          </Text>
        }
      />
    </Animated.View>
  );

  const pinPane = (
    <Animated.View entering={FadeInUp.duration(480)} style={styles.pinPane}>
      <Text style={[typography.brand, { color: theme.colors.primary }]}>
        {APP_CONFIG.shortName}
      </Text>
      <Text style={[typography.h2, { color: theme.colors.onSurface, marginTop: spacing.xs }]}>
        {APP_CONFIG.name}
      </Text>
      <Text
        style={{
          color: theme.colors.onSurfaceVariant,
          marginTop: spacing.sm,
          marginBottom: spacing.lg,
          textAlign: 'center',
        }}
      >
        {selected
          ? `PIN de ${selected.displayName} (dev: ${APP_CONFIG.devPin})`
          : 'Choisissez un profil pour déverrouiller la caisse'}
      </Text>

      {selected ? (
        <PinPad
          value={pin}
          maxLength={APP_CONFIG.pinLength}
          onChange={(next) => {
            clearError();
            setPin(next);
          }}
          disabled={isSubmitting}
        />
      ) : null}

      {APP_CONFIG.allowPinSkip ? (
        <Button
          mode="contained"
          onPress={() => void skipPinLogin()}
          loading={isSubmitting}
          disabled={isSubmitting || !(employeesQuery.data?.length)}
          style={styles.skipButton}
          contentStyle={styles.skipButtonContent}
        >
          Passer
        </Button>
      ) : null}

      {errorMessage ? (
        <Text style={[styles.error, { color: theme.colors.error }]}>{errorMessage}</Text>
      ) : null}
    </Animated.View>
  );

  return (
    <Screen padded={false}>
      <View
        style={[
          styles.root,
          useSplitLayout ? styles.rootSplit : styles.rootStack,
          { backgroundColor: theme.colors.background },
        ]}
      >
        {useSplitLayout ? (
          <>
            <View style={[styles.hero, { backgroundColor: theme.colors.primary }]}>
              <Text style={[typography.brand, { color: theme.colors.onPrimary }]}>NFP</Text>
              <Text
                style={[
                  typography.h2,
                  { color: theme.colors.onPrimary, marginTop: spacing.sm, opacity: 0.92 },
                ]}
              >
                Caisse prête. Mode hors-ligne.
              </Text>
            </View>
            <View style={styles.splitContent}>
              {employeeList}
              {pinPane}
            </View>
          </>
        ) : (
          <>
            {pinPane}
            {employeeList}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  rootSplit: { flexDirection: 'row' },
  rootStack: { padding: spacing.lg, gap: spacing.lg },
  hero: {
    width: '38%',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl,
    justifyContent: 'flex-end',
  },
  splitContent: {
    flex: 1,
    flexDirection: 'row',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  listPane: { flex: 1, gap: spacing.sm },
  pinPane: {
    flex: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  listContent: { gap: spacing.sm, paddingVertical: spacing.sm },
  employeeRow: {
    minHeight: touchTarget.comfortable,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  skipButton: {
    marginTop: spacing.lg,
    minWidth: 220,
    borderRadius: radii.md,
  },
  skipButtonContent: {
    minHeight: touchTarget.comfortable,
  },
  error: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
