import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PosScreen } from '@/features/cart/presentation/screens/PosScreen';
import { CheckoutScreen } from '@/features/checkout/presentation/screens/CheckoutScreen';
import { SaleCompleteScreen } from '@/features/checkout/presentation/screens/SaleCompleteScreen';
import { DashboardScreen } from '@/features/dashboard/presentation/screens/DashboardScreen';
import { CategoryListScreen } from '@/features/products/presentation/screens/CategoryListScreen';
import { ProductFormScreen } from '@/features/products/presentation/screens/ProductFormScreen';
import { ProductListScreen } from '@/features/products/presentation/screens/ProductListScreen';
import type { AppStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * Authenticated shell: dashboard, POS, catalog.
 */
export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Pos" component={PosScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="SaleComplete" component={SaleCompleteScreen} />
      <Stack.Screen name="ProductList" component={ProductListScreen} />
      <Stack.Screen name="ProductForm" component={ProductFormScreen} />
      <Stack.Screen name="CategoryList" component={CategoryListScreen} />
    </Stack.Navigator>
  );
}
