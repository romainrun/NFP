import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';
import { MemberListScreen } from '@/features/authentication/presentation/screens/MemberListScreen';
import { PosScreen } from '@/features/cart/presentation/screens/PosScreen';
import { SalesHistoryScreen } from '@/features/checkout/presentation/screens/SalesHistoryScreen';
import { CashClosingScreen } from '@/features/checkout/presentation/screens/CashClosingScreen';
import { DashboardScreen } from '@/features/dashboard/presentation/screens/DashboardScreen';
import { CategoryListScreen } from '@/features/products/presentation/screens/CategoryListScreen';
import { InventoryScreen } from '@/features/products/presentation/screens/InventoryScreen';
import { ProductListScreen } from '@/features/products/presentation/screens/ProductListScreen';
import { PromotionListScreen } from '@/features/promotions/presentation/screens/PromotionListScreen';
import { ExportsScreen } from '@/features/reports/presentation/screens/ExportsScreen';
import { SettingsScreen } from '@/features/settings/presentation/screens/SettingsScreen';
import { AppSideMenu } from '@/navigation/AppSideMenu';
import { useDrawerStore } from '@/navigation/drawerStore';
import type { MainParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<MainParamList>();

/**
 * Main authenticated destinations + controlled side menu overlay.
 */
export function MainDrawer() {
  const theme = useTheme();
  const setActiveRoute = useDrawerStore((s) => s.setActiveRoute);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: theme.colors.background },
        }}
        screenListeners={{
          state: (event) => {
            const state = event.data.state;
            const route = state.routes[state.index]?.name as keyof MainParamList | undefined;
            if (route) setActiveRoute(route);
          },
        }}
      >
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Pos" component={PosScreen} />
        <Stack.Screen name="SalesHistory" component={SalesHistoryScreen} />
        <Stack.Screen name="CashClosing" component={CashClosingScreen} />
        <Stack.Screen name="Exports" component={ExportsScreen} />
        <Stack.Screen name="ProductList" component={ProductListScreen} />
        <Stack.Screen name="CategoryList" component={CategoryListScreen} />
        <Stack.Screen name="Inventory" component={InventoryScreen} />
        <Stack.Screen name="Promotions" component={PromotionListScreen} />
        <Stack.Screen name="Members" component={MemberListScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
      <AppSideMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
