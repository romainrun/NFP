import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTheme } from 'react-native-paper';
import { PosScreen } from '@/features/cart/presentation/screens/PosScreen';
import { SalesHistoryScreen } from '@/features/checkout/presentation/screens/SalesHistoryScreen';
import { DashboardScreen } from '@/features/dashboard/presentation/screens/DashboardScreen';
import { CategoryListScreen } from '@/features/products/presentation/screens/CategoryListScreen';
import { ProductListScreen } from '@/features/products/presentation/screens/ProductListScreen';
import { AppDrawerContent } from '@/navigation/AppDrawerContent';
import type { DrawerParamList } from '@/navigation/types';

const Drawer = createDrawerNavigator<DrawerParamList>();

/**
 * Overlay drawer on all sizes so it can always be closed (swipe / overlay / X).
 */
export function MainDrawer() {
  const theme = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        swipeEnabled: true,
        overlayColor: 'rgba(34, 34, 34, 0.28)',
        drawerStyle: {
          width: 300,
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
