import { StyleSheet, View } from 'react-native';
import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { Button, Divider, IconButton, Text, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { APP_CONFIG } from '@/core/config/appConfig';
import { hasPermission } from '@/features/authentication/domain/permissions';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import { brandGradient, Colors } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Item = {
  key: string;
  label: string;
  icon: string;
  route: 'Dashboard' | 'Pos' | 'SalesHistory' | 'ProductList' | 'CategoryList';
  section: string;
};

const ITEMS: Item[] = [
  { key: 'dash', label: 'Tableau de bord', icon: 'view-dashboard-outline', route: 'Dashboard', section: 'Accueil' },
  { key: 'pos', label: 'Caisse', icon: 'cash-register', route: 'Pos', section: 'Vente' },
  { key: 'history', label: 'Historique des ventes', icon: 'history', route: 'SalesHistory', section: 'Vente' },
  { key: 'products', label: 'Articles', icon: 'barcode', route: 'ProductList', section: 'Catalogue' },
  { key: 'categories', label: 'Catégories', icon: 'shape-outline', route: 'CategoryList', section: 'Catalogue' },
];

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const theme = useTheme();
  const { session, logout } = useAuth();
  const active = props.state.routes[props.state.index]?.name;
  const canManageCatalog = Boolean(
    session && hasPermission(session.employee.role, 'inventory.manage'),
  );

  const visible = ITEMS.filter((item) => {
    if (item.route === 'CategoryList') return canManageCatalog;
    return true;
  });

  const sections = Array.from(new Set(visible.map((item) => item.section)));

  const go = (route: Item['route']) => {
    props.navigation.navigate(route);
    props.navigation.closeDrawer();
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[...brandGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <Text style={[typography.brand, { color: Colors.white, fontSize: 32, flex: 1 }]}>
            {APP_CONFIG.shortName}
          </Text>
          <IconButton
            icon="close"
            iconColor={Colors.white}
            size={22}
            onPress={() => props.navigation.closeDrawer()}
            accessibilityLabel="Fermer le menu"
          />
        </View>
        <Text style={{ color: Colors.white, opacity: 0.95 }}>
          {session?.employee.displayName ?? 'Collaborateur'}
        </Text>
        <Text style={[typography.caption, { color: Colors.white, opacity: 0.8 }]}>
          {session?.employee.role?.toUpperCase()} · Naturally Forme
        </Text>
      </LinearGradient>

      <DrawerContentScrollView {...props} contentContainerStyle={styles.scroll}>
        {sections.map((section) => (
          <View key={section} style={styles.section}>
            <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
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
                    textColor={selected ? Colors.onPrimary : theme.colors.onSurface}
                  >
                    {item.label}
                  </Button>
                );
              })}
          </View>
        ))}
      </DrawerContentScrollView>

      <View style={styles.footer}>
        <Divider />
        <Button
          mode="outlined"
          icon="lock-outline"
          textColor={Colors.primary}
          style={{ marginTop: spacing.sm, borderColor: Colors.primary, borderRadius: radii.button }}
          onPress={() => {
            props.navigation.closeDrawer();
            void logout();
          }}
        >
          Verrouiller
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radii.card,
    borderBottomRightRadius: radii.card,
    gap: spacing.xxs,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scroll: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  section: {
    marginBottom: spacing.md,
    gap: spacing.xs,
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
});
