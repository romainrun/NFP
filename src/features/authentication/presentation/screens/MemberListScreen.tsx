import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  HelperText,
  Portal,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { APP_CONFIG } from '@/core/config/appConfig';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import type { IUserRepository } from '@/features/authentication/data/UserRepository';
import { hasPermission } from '@/features/authentication/domain/permissions';
import type { Employee, UserRole } from '@/features/authentication/domain/types';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import { AppHeader } from '@/shared/components/AppHeader';
import { Screen } from '@/shared/components/Screen';
import { MemberListSkeleton } from '@/shared/components/skeletons';
import type { IAuditService } from '@/shared/services/audit/AuditService';
import { Colors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  cashier: 'Caissier',
};

export function MemberListScreen() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const canManage = Boolean(
    session && hasPermission(session.employee.role, 'users.manage'),
  );
  const userId = session?.employee.id;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [pin, setPin] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const membersQuery = useQuery({
    queryKey: ['members', 'all'],
    enabled: canManage,
    queryFn: async () => {
      const repo = container.resolve<IUserRepository>(TOKENS.UserRepository);
      const result = await repo.listAll();
      if (!result.ok) throw result.error;
      return result.value;
    },
  });

  const openCreate = () => {
    setEditing(null);
    setDisplayName('');
    setEmployeeCode('');
    setRole('cashier');
    setPin(APP_CONFIG.devPin);
    setIsActive(true);
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (member: Employee) => {
    setEditing(member);
    setDisplayName(member.displayName);
    setEmployeeCode(member.employeeCode);
    setRole(member.role);
    setPin('');
    setIsActive(member.isActive);
    setError(null);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!canManage || !userId) throw new Error('Permission refusée');
      const repo = container.resolve<IUserRepository>(TOKENS.UserRepository);
      const audit = container.resolve<IAuditService>(TOKENS.AuditService);

      if (editing) {
        const updated = await repo.update({
          id: editing.id,
          displayName,
          role,
          isActive,
        });
        if (!updated.ok) throw updated.error;

        if (pin.trim()) {
          const pinResult = await repo.setPin(editing.id, pin.trim());
          if (!pinResult.ok) throw pinResult.error;
        }

        await audit.log({
          userId,
          action: 'user_change',
          entityType: 'user',
          entityId: editing.id,
          payload: { op: 'update', role, isActive, pinReset: Boolean(pin.trim()) },
        });
        return updated.value;
      }

      const created = await repo.create({
        employeeCode,
        displayName,
        role,
        pin: pin.trim() || APP_CONFIG.devPin,
      });
      if (!created.ok) throw created.error;
      await audit.log({
        userId,
        action: 'user_change',
        entityType: 'user',
        entityId: created.value.id,
        payload: { op: 'create', role, employeeCode: created.value.employeeCode },
      });
      return created.value;
    },
    onSuccess: async () => {
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['members'] });
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!canManage) {
    return (
      <Screen centered>
        <Text style={[typography.h2, { color: Colors.text }]}>Accès réservé aux admins</Text>
      </Screen>
    );
  }

  if (membersQuery.isLoading && !membersQuery.data) {
    return (
      <Screen padded={false}>
        <MemberListSkeleton />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <AppHeader
          title="Membres"
          subtitle="Codes d’accès et rôles"
          right={
            <Button mode="contained" onPress={openCreate} buttonColor={Colors.primary}>
              Ajouter
            </Button>
          }
        />
      </View>

      <FlatList
        data={membersQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={membersQuery.isRefetching}
        onRefresh={() => void membersQuery.refetch()}
        renderItem={({ item }) => (
          <View
            style={[
              styles.row,
              shadows.sm,
              { opacity: item.isActive ? 1 : 0.55 },
            ]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[typography.bodyStrong, { color: Colors.text }]}>
                {item.displayName}
              </Text>
              <Text style={[typography.caption, { color: Colors.textSecondary }]}>
                {item.employeeCode} · {ROLE_LABELS[item.role]}
                {!item.isActive ? ' · Inactif' : ''}
              </Text>
            </View>
            <Button compact textColor={Colors.primary} onPress={() => openEdit(item)}>
              Modifier
            </Button>
          </View>
        )}
      />

      <Portal>
        <Dialog visible={dialogOpen} onDismiss={() => setDialogOpen(false)}>
          <Dialog.Title>{editing ? 'Modifier le membre' : 'Nouveau membre'}</Dialog.Title>
          <Dialog.Content style={{ gap: spacing.sm }}>
            <TextInput
              mode="outlined"
              label="Nom affiché"
              value={displayName}
              onChangeText={setDisplayName}
            />
            <TextInput
              mode="outlined"
              label="Code collaborateur"
              value={employeeCode}
              onChangeText={setEmployeeCode}
              autoCapitalize="characters"
              disabled={Boolean(editing)}
            />
            <Text style={[typography.caption, { color: Colors.textSecondary }]}>Rôle</Text>
            <SegmentedButtons
              value={role}
              onValueChange={(value) => setRole(value as UserRole)}
              buttons={[
                { value: 'cashier', label: 'Caisse' },
                { value: 'manager', label: 'Manager' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
            <TextInput
              mode="outlined"
              label={editing ? 'Nouveau PIN (optionnel)' : `PIN (${APP_CONFIG.pinLength} chiffres)`}
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={APP_CONFIG.pinLength}
            />
            {editing ? (
              <View style={styles.switchRow}>
                <Text style={[typography.body, { color: Colors.text }]}>Actif</Text>
                <Switch value={isActive} onValueChange={setIsActive} color={Colors.primary} />
              </View>
            ) : null}
            {error ? (
              <HelperText type="error" visible>
                {error}
              </HelperText>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogOpen(false)}>Annuler</Button>
            <Button
              loading={saveMutation.isPending}
              onPress={() => {
                setError(null);
                saveMutation.mutate();
              }}
            >
              Enregistrer
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
