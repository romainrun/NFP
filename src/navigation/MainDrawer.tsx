import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTheme } from 'react-native-paper';
import { PosScreen } from '@/features/cart/presentation/screens/PosScreen';
import { SalesHistoryScreen } from '@/features/checkout/presentation/screens/SalesHistoryScreen';
import { DashboardScreen } from '@/features/dashboard/presentation/screens/DashboardScreen';
import { CategoryListScreen } from '@/features/products/presentation/screens/CategoryListScreen';
import { ProductListScreen } from '@/features/products/presentation/screens/ProductListScreen';
import { AppDrawerContent } from '@/navigation/AppDrawerContent';
import type { DrawerParamList } from '@/navigation/types';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';

const Drawer = createDrawerNavigator<DrawerParamList>();

export function MainDrawer() {
  const theme = useTheme();
  const { isTablet } = useResponsiveLayout();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: isTablet ? 'permanent' : 'front',
        overlayColor: theme.dark ? 'rgba(0,0,0,0.45)' : 'rgba(16,42,39,0.28)',
        drawerStyle: {
          width: isTablet ? 300 : 300,
          backgroundColor: theme.colors.background,
        },
        sceneStyle: {
          backgroundColor: 'transparent',
        },
      }}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="Pos" component={PosScreen} />
      <Drawer.Screen name="SalesHistory" component={SalesHistoryScreen} />
      <Drawer.Screen name="ProductList" component={ProductListScreen} />
      <Drawer.Screen name="CategoryList" component={CategoryListScreen} />
    </Drawer.Navigator>
  );
}
