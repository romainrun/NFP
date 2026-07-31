import { StyleSheet, View } from 'react-native';
import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { Button, Divider, Text, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { APP_CONFIG } from '@/core/config/appConfig';
import { hasPermission } from '@/features/authentication/domain/permissions';
import { useAuth } from '@/features/authentication/presentation/hooks/useAuth';
import { darkColors, lightColors } from '@/shared/theme/colors';
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
  const tokens = theme.dark ? darkColors : lightColors;
  const { session, logout } = useAuth();
  const active = props.state.routes[props.state.index]?.name;
  const canManageCatalog = Boolean(
    session && hasPermission(session.employee.role, 'inventory.manage'),
  );

  const visible = ITEMS.filter((item) => {
    if (item.route === 'ProductList' || item.route === 'CategoryList') {
      return canManageCatalog || item.route === 'ProductList';
    }
    return true;
  });

  const sections = Array.from(new Set(visible.map((item) => item.section)));

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[tokens.heroInk, tokens.primary, tokens.gradientTop]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={[typography.brand, { color: tokens.onPrimary, fontSize: 36 }]}>
          {APP_CONFIG.shortName}
        </Text>
        <Text style={{ color: tokens.onPrimary, opacity: 0.9 }}>
          {session?.employee.displayName ?? 'Collaborateur'}
        </Text>
        <Text style={[typography.caption, { color: tokens.onPrimary, opacity: 0.75 }]}>
          {session?.employee.role?.toUpperCase()} · caisse offline
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
                    onPress={() => props.navigation.navigate(item.route)}
                    style={styles.item}
                    contentStyle={styles.itemContent}
                    labelStyle={{ textAlign: 'left' }}
                    buttonColor={selected ? theme.colors.primary : undefined}
                    textColor={selected ? theme.colors.onPrimary : theme.colors.onSurface}
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
          onPress={() => void logout()}
          style={{ marginTop: spacing.sm }}
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
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    gap: spacing.xxs,
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
    borderRadius: radii.md,
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
