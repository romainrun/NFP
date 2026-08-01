import { useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, IconButton, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { hasPermission } from '@/features/authentication/domain/permissions';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import { useDrawerStore } from '@/navigation/drawerStore';
import type { AppStackParamList, MainParamList } from '@/navigation/types';
import { BRAND } from '@/shared/theme/brand';
import { brandGradient, Colors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Item = {
  key: string;
  label: string;
  icon: string;
  route: keyof MainParamList;
  section: string;
};

const ITEMS: Item[] = [
  { key: 'dash', label: 'Tableau de bord', icon: 'view-dashboard-outline', route: 'Dashboard', section: 'Accueil' },
  { key: 'pos', label: 'Caisse', icon: 'cash-register', route: 'Pos', section: 'Vente' },
  { key: 'history', label: 'Historique des ventes', icon: 'history', route: 'SalesHistory', section: 'Vente' },
  { key: 'closing', label: 'Clôture de caisse', icon: 'cash-check', route: 'CashClosing', section: 'Vente' },
  { key: 'exports', label: 'Exports', icon: 'file-delimited-outline', route: 'Exports', section: 'Rapports' },
  { key: 'products', label: 'Articles', icon: 'barcode', route: 'ProductList', section: 'Catalogue' },
  { key: 'categories', label: 'Catégories', icon: 'shape-outline', route: 'CategoryList', section: 'Catalogue' },
  { key: 'inventory', label: 'Inventaire', icon: 'clipboard-list-outline', route: 'Inventory', section: 'Catalogue' },
  { key: 'settings', label: 'Paramètres', icon: 'cog-outline', route: 'Settings', section: 'Administration' },
];

/**
 * Fully controlled side menu (Modal).
 * Overlay tap / ✕ / navigation / logout always closes it.
 */
export function AppSideMenu() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const isOpen = useDrawerStore((s) => s.isOpen);
  const close = useDrawerStore((s) => s.close);
  const active = useDrawerStore((s) => s.activeRoute);
  const { session, logout } = useAuth();

  useEffect(() => {
    if (!session) close();
  }, [session, close]);

  const canManageCatalog = Boolean(
    session && hasPermission(session.employee.role, 'inventory.manage'),
  );
  const canManageSettings = Boolean(
    session && hasPermission(session.employee.role, 'settings.manage'),
  );
  const canViewReports = Boolean(
    session && hasPermission(session.employee.role, 'reports.view'),
  );

  const visible = ITEMS.filter((item) => {
    if (item.route === 'CashClosing') return canViewReports;
    if (item.route === 'Exports') return canViewReports;
    if (item.route === 'CategoryList') return canManageCatalog;
    if (item.route === 'Inventory') return canManageCatalog;
    if (item.route === 'Settings') return canManageSettings;
    return true;
  });

  const sections = Array.from(new Set(visible.map((item) => item.section)));

  const go = (route: keyof MainParamList) => {
    close();
    navigation.navigate('Main', { screen: route });
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={styles.overlay}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Fermer le menu"
        />

        <View style={[styles.panel, shadows.lg]} accessibilityViewIsModal>
          <LinearGradient
            colors={[...brandGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroTop}>
              <Text style={[typography.brand, { color: Colors.white, fontSize: 28, flex: 1 }]}>
                {BRAND.shortName}
              </Text>
              <IconButton
                icon="close"
                iconColor={Colors.white}
                size={22}
                onPress={close}
                accessibilityLabel="Fermer"
              />
            </View>
            <Text style={[typography.subtitle, { color: Colors.white, opacity: 0.95 }]}>
              {session?.employee.displayName ?? 'Collaborateur'}
            </Text>
            <Text style={[typography.caption, { color: Colors.white, opacity: 0.85 }]}>
              {session?.employee.role?.toUpperCase()} · {BRAND.name}
            </Text>
            <Text style={[typography.caption, { color: Colors.white, opacity: 0.75, fontSize: 12 }]}>
              {BRAND.tagline}
            </Text>
          </LinearGradient>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {sections.map((section) => (
              <View key={section} style={styles.section}>
                <Text style={[typography.caption, styles.sectionLabel]}>
                  {section.toUpperCase()}
                </Text>
                {visible
                  .filter((item) => item.section === section)
                  .map((item) => {
                    const selected = active === item.route;
                    return (
                      <Button
                        key={item.key}
                        mode={selected ? 'contained' : 'text'}
                        icon={item.icon}
                        onPress={() => go(item.route)}
                        style={styles.item}
                        contentStyle={styles.itemContent}
                        labelStyle={[typography.button, { textAlign: 'left' }]}
                        buttonColor={selected ? Colors.primary : undefined}
                        textColor={selected ? Colors.onPrimary : Colors.text}
                      >
                        {item.label}
                      </Button>
                    );
                  })}
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Divider style={{ backgroundColor: Colors.divider }} />
            <Button
              mode="outlined"
              icon="lock-outline"
              textColor={Colors.primary}
              style={styles.lockBtn}
              labelStyle={typography.button}
              onPress={() => {
                close();
                void logout();
              }}
            >
              Verrouiller
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 34, 34, 0.4)',
  },
  panel: {
    width: 300,
    maxWidth: '86%',
    height: '100%',
    backgroundColor: Colors.background,
    zIndex: 2,
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.xxs,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    marginLeft: spacing.sm,
    marginBottom: spacing.xxs,
    letterSpacing: 0.6,
  },
  item: {
    justifyContent: 'flex-start',
    borderRadius: radii.button,
  },
  itemContent: {
    justifyContent: 'flex-start',
    minHeight: 48,
  },
  footer: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  lockBtn: {
    marginTop: spacing.sm,
    borderColor: Colors.primary,
    borderRadius: radii.button,
  },
});
