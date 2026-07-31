import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CheckoutScreen } from '@/features/checkout/presentation/screens/CheckoutScreen';
import { SaleCompleteScreen } from '@/features/checkout/presentation/screens/SaleCompleteScreen';
import { ProductFormScreen } from '@/features/products/presentation/screens/ProductFormScreen';
import { MainDrawer } from '@/navigation/MainDrawer';
import type { AppStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * Authenticated shell: drawer destinations + modal sale/catalog flows.
 */
export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Main" component={MainDrawer} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="SaleComplete" component={SaleCompleteScreen} />
      <Stack.Screen name="ProductForm" component={ProductFormScreen} />
    </Stack.Navigator>
  );
}
