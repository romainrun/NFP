import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { container } from '@/core/di/container';
import { TOKENS } from '@/core/di/tokens';
import { hasPermission } from '@/features/authentication/domain/permissions';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import type { IAdminSettingsRepository } from '@/features/settings/data/AdminSettingsRepository';
import type { AppStackParamList } from '@/navigation/types';
import { AppHeader } from '@/shared/components/AppHeader';
import { Screen } from '@/shared/components/Screen';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Nav = NativeStackNavigationProp<AppStackParamList>;

type AdminRoute =
  | 'AdminStore'
  | 'AdminPos'
  | 'AdminPayments'
  | 'AdminTaxes'
  | 'AdminReceipts'
  | 'AdminInventory'
  | 'AdminPromotions'
  | 'AdminEmployees'
  | 'AdminDevices'
  | 'AdminSync'
  | 'AdminServerBackups'
  | 'AdminImportExport'
  | 'AdminActivity'
  | 'AdminDeveloper';

const ADMIN_ITEMS: Array<{
  key: string;
  title: string;
  description: string;
  icon: string;
  route: AdminRoute;
  developerOnly?: boolean;
}> = [
  { key: 'store', title: 'Magasin', description: 'Nom, adresse, logo', icon: 'store', route: 'AdminStore' },
  { key: 'pos', title: 'Caisse', description: 'Tickets et confirmations', icon: 'cash-register', route: 'AdminPos' },
  { key: 'payments', title: 'Paiements', description: 'Modes acceptés', icon: 'credit-card-outline', route: 'AdminPayments' },
  { key: 'taxes', title: 'Taxes', description: 'Taux de TVA', icon: 'percent', route: 'AdminTaxes' },
  { key: 'receipts', title: 'Tickets', description: 'Logo, QR code, textes', icon: 'receipt', route: 'AdminReceipts' },
  { key: 'inventory', title: 'Inventaire', description: 'Stock en caisse', icon: 'clipboard-list-outline', route: 'AdminInventory' },
  { key: 'promotions', title: 'Promotions', description: 'Remises sur produits', icon: 'tag-percent-outline', route: 'AdminPromotions' },
  { key: 'employees', title: 'Employés', description: 'Accès et statut', icon: 'account-group-outline', route: 'AdminEmployees' },
  { key: 'import', title: 'Import catalogue', description: 'CSV produits uniquement', icon: 'swap-horizontal', route: 'AdminImportExport' },
  { key: 'server', title: 'Serveur & sauvegardes', description: 'État backend et sauvegardes', icon: 'server', route: 'AdminServerBackups' },
  { key: 'activity', title: 'Historique', description: 'Activité du magasin', icon: 'history', route: 'AdminActivity' },
  { key: 'devices', title: 'Appareils', description: 'Cet appareil', icon: 'cellphone-link', route: 'AdminDevices' },
  { key: 'sync', title: 'Synchronisation', description: 'État du backend', icon: 'cloud-sync-outline', route: 'AdminSync' },
  { key: 'developer', title: 'Mode développeur', description: 'Diagnostics', icon: 'code-tags', route: 'AdminDeveloper', developerOnly: true },
];

export function SettingsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const canManage = Boolean(
    session && hasPermission(session.employee.role, 'settings.manage'),
  );
  const isAdmin = session?.employee.role === 'admin';

  const developerQuery = useQuery({
    queryKey: ['admin', 'developer-flag'],
    enabled: canManage,
    queryFn: async () => {
      const repo = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);
      const result = await repo.getBundle();
      if (!result.ok) throw result.error;
      return result.value.developer.enabled;
    },
  });

  const toggleDeveloperMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const repo = container.resolve<IAdminSettingsRepository>(TOKENS.AdminSettingsRepository);
      const bundle = await repo.getBundle();
      if (!bundle.ok) throw bundle.error;
      const result = await repo.setDeveloper({ enabled });
      if (!result.ok) throw result.error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'developer-flag'] });
    },
  });

  if (!canManage) {
    return (
      <Screen centered>
        <Text style={[typography.h2, { color: theme.colors.onSurface }]}>
          Accès paramètres réservé
        </Text>
      </Screen>
    );
  }

  const items = ADMIN_ITEMS.filter(
    (item) => !item.developerOnly || developerQuery.data === true,
  );

  return (
    <Screen padded={false} atmosphere>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          title="Paramètres"
          subtitle="Administration Naturally Forme — tout depuis l’app"
          showBrandMark
        />

        <Text
          style={[typography.h3, { color: theme.colors.onSurface }]}
          onLongPress={() => {
            if (!isAdmin) return;
            toggleDeveloperMutation.mutate(!developerQuery.data);
          }}
        >
          Administration
        </Text>
        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
          Configuration du magasin sans back-office web.
        </Text>

        <View style={styles.list}>
          {items.map((item) => (
            <List.Item
              key={item.key}
              title={item.title}
              description={item.description}
              left={(props) => <List.Icon {...props} icon={item.icon} color={theme.colors.primary} />}
              onPress={() => navigation.navigate(item.route)}
              style={[styles.row, { borderColor: theme.colors.outline }]}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  list: {
    gap: spacing.xs,
  },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    marginBottom: spacing.xs,
  },
});
