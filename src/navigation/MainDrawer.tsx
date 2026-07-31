import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MemberListScreen } from '@/features/authentication/presentation/screens/MemberListScreen';
import { PosScreen } from '@/features/cart/presentation/screens/PosScreen';
import { SalesHistoryScreen } from '@/features/checkout/presentation/screens/SalesHistoryScreen';
import { DashboardScreen } from '@/features/dashboard/presentation/screens/DashboardScreen';
import { CategoryListScreen } from '@/features/products/presentation/screens/CategoryListScreen';
import { ProductListScreen } from '@/features/products/presentation/screens/ProductListScreen';
import { SettingsScreen } from '@/features/settings/presentation/screens/SettingsScreen';
import { AppSideMenu } from '@/navigation/AppSideMenu';
import { useDrawerStore } from '@/navigation/drawerStore';
import type { MainParamList } from '@/navigation/types';
import { Colors } from '@/shared/theme/colors';

const Stack = createNativeStackNavigator<MainParamList>();

/**
 * Main authenticated destinations + controlled side menu overlay.
 */
export function MainDrawer() {
  const setActiveRoute = useDrawerStore((s) => s.setActiveRoute);

  return (
    <View style={styles.root}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: Colors.background },
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
        <Stack.Screen name="ProductList" component={ProductListScreen} />
        <Stack.Screen name="CategoryList" component={CategoryListScreen} />
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
