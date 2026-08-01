import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { format } from 'date-fns';
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
import type { Employee, UserRole } from '@/features/authentication/domain/types';
import { AdminScreenShell } from '@/features/settings/presentation/components/AdminScreenShell';
import { MemberListSkeleton } from '@/shared/components/skeletons';
import { trackActivity } from '@/shared/services/activity/activityTracker';
import { Colors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  cashier: 'Caissier',
};

const USER_COLORS = ['#C9A227', '#2563EB', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B'];

function formatTs(value: string | null): string {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd/MM/yy HH:mm');
  } catch {
    return value;
  }
}

export function AdminEmployeesScreen() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [pin, setPin] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [userColor, setUserColor] = useState<string | null>(null);
  const [forcePinChange, setForcePinChange] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const membersQuery = useQuery({
    queryKey: ['members', 'all'],
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
    setUserColor(USER_COLORS[0] ?? null);
    setForcePinChange(false);
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
    setUserColor(member.userColor);
    setForcePinChange(member.forcePinChange);
    setError(null);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const repo = container.resolve<IUserRepository>(TOKENS.UserRepository);

      if (editing) {
        const updated = await repo.update({
          id: editing.id,
          displayName,
          role,
          isActive,
          userColor,
          forcePinChange,
        });
        if (!updated.ok) throw updated.error;
        if (pin.trim()) {
          const pinResult = await repo.setPin(editing.id, pin.trim());
          if (!pinResult.ok) throw pinResult.error;
        }
        return updated.value;
      }

      const created = await repo.create({
        employeeCode,
        displayName,
        role,
        pin: pin.trim() || APP_CONFIG.devPin,
      });
      if (!created.ok) throw created.error;
      if (userColor) {
        await repo.update({
          id: created.value.id,
          displayName: created.value.displayName,
          role: created.value.role,
          isActive: created.value.isActive,
          userColor,
        });
      }
      return created.value;
    },
    onSuccess: async () => {
      setDialogOpen(false);
      await trackActivity();
      await queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  if (membersQuery.isLoading && !membersQuery.data) {
    return (
      <AdminScreenShell title="Employés" subtitle="Chargement…">
        <MemberListSkeleton />
      </AdminScreenShell>
    );
  }

  return (
    <AdminScreenShell title="Employés" subtitle="Collaborateurs Naturally Forme">
      <Button mode="contained" onPress={openCreate} style={{ marginBottom: spacing.sm }}>
        Ajouter un employé
      </Button>

      <FlatList
        data={membersQuery.data ?? []}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.row, shadows.sm, { opacity: item.isActive ? 1 : 0.55 }]}>
            <View
              style={[
                styles.colorDot,
                { backgroundColor: item.userColor ?? Colors.primary },
              ]}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[typography.bodyStrong, { color: Colors.text }]}>
                {item.displayName}
              </Text>
              <Text style={[typography.caption, { color: Colors.textSecondary }]}>
                {item.employeeCode} · {ROLE_LABELS[item.role]}
                {!item.isActive ? ' · Inactif' : ''}
              </Text>
              <Text style={[typography.caption, { color: Colors.textSecondary }]}>
                Connexion : {formatTs(item.lastLoginAt)} · Activité : {formatTs(item.lastActivityAt)}
              </Text>
              {item.forcePinChange ? (
                <Text style={[typography.caption, { color: Colors.error }]}>
                  Changement PIN requis
                </Text>
              ) : null}
            </View>
            <Button compact onPress={() => openEdit(item)}>Modifier</Button>
          </View>
        )}
      />

      <Portal>
        <Dialog visible={dialogOpen} onDismiss={() => setDialogOpen(false)}>
          <Dialog.Title>{editing ? 'Modifier l’employé' : 'Nouvel employé'}</Dialog.Title>
          <Dialog.Content style={{ gap: spacing.sm }}>
            <TextInput mode="outlined" label="Nom affiché" value={displayName} onChangeText={setDisplayName} />
            <TextInput
              mode="outlined"
              label="Code collaborateur"
              value={employeeCode}
              onChangeText={setEmployeeCode}
              autoCapitalize="characters"
              disabled={Boolean(editing)}
            />
            <Text style={typography.caption}>Rôle</Text>
            <SegmentedButtons
              value={role}
              onValueChange={(v) => setRole(v as UserRole)}
              buttons={[
                { value: 'cashier', label: 'Caisse' },
                { value: 'manager', label: 'Manager' },
                { value: 'admin', label: 'Admin' },
              ]}
            />
            <Text style={typography.caption}>Couleur</Text>
            <View style={styles.colorRow}>
              {USER_COLORS.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setUserColor(color)}
                  style={[
                    styles.colorPick,
                    { backgroundColor: color },
                    userColor === color && styles.colorPickSelected,
                  ]}
                />
              ))}
            </View>
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
              <>
                <View style={styles.switchRow}>
                  <Text style={typography.body}>Actif</Text>
                  <Switch value={isActive} onValueChange={setIsActive} />
                </View>
                <View style={styles.switchRow}>
                  <Text style={typography.body}>Forcer changement PIN</Text>
                  <Switch value={forcePinChange} onValueChange={setForcePinChange} />
                </View>
              </>
            ) : null}
            {error ? (
              <HelperText type="error" visible>{error}</HelperText>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogOpen(false)}>Annuler</Button>
            <Button loading={saveMutation.isPending} onPress={() => saveMutation.mutate()}>
              Enregistrer
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </AdminScreenShell>
  );
}

const styles = StyleSheet.create({
  list: {
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
    gap: spacing.sm,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  colorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  colorPick: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorPickSelected: {
    borderWidth: 2,
    borderColor: Colors.black,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
