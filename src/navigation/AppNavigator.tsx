import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';
import { CheckoutScreen } from '@/features/checkout/presentation/screens/CheckoutScreen';
import { SaleCompleteScreen } from '@/features/checkout/presentation/screens/SaleCompleteScreen';
import { ProductFormScreen } from '@/features/products/presentation/screens/ProductFormScreen';
import { AdminDeveloperScreen } from '@/features/settings/presentation/screens/admin/AdminDeveloperScreen';
import { AdminDevicesScreen } from '@/features/settings/presentation/screens/admin/AdminDevicesScreen';
import { AdminEmployeesScreen } from '@/features/settings/presentation/screens/admin/AdminEmployeesScreen';
import { AdminInventoryScreen } from '@/features/settings/presentation/screens/admin/AdminInventoryScreen';
import { AdminPaymentsScreen } from '@/features/settings/presentation/screens/admin/AdminPaymentsScreen';
import { AdminPosScreen } from '@/features/settings/presentation/screens/admin/AdminPosScreen';
import { AdminPromotionsScreen } from '@/features/settings/presentation/screens/admin/AdminPromotionsScreen';
import { AdminReceiptsScreen } from '@/features/settings/presentation/screens/admin/AdminReceiptsScreen';
import { AdminStoreScreen } from '@/features/settings/presentation/screens/admin/AdminStoreScreen';
import { AdminSyncScreen } from '@/features/settings/presentation/screens/admin/AdminSyncScreen';
import { AdminTaxesScreen } from '@/features/settings/presentation/screens/admin/AdminTaxesScreen';
import { MainDrawer } from '@/navigation/MainDrawer';
import type { AppStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * Authenticated shell: drawer destinations + modal sale/catalog flows.
 */
export function AppNavigator() {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="Main" component={MainDrawer} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="SaleComplete" component={SaleCompleteScreen} />
      <Stack.Screen name="ProductForm" component={ProductFormScreen} />
      <Stack.Screen name="AdminStore" component={AdminStoreScreen} />
      <Stack.Screen name="AdminPos" component={AdminPosScreen} />
      <Stack.Screen name="AdminPayments" component={AdminPaymentsScreen} />
      <Stack.Screen name="AdminTaxes" component={AdminTaxesScreen} />
      <Stack.Screen name="AdminReceipts" component={AdminReceiptsScreen} />
      <Stack.Screen name="AdminInventory" component={AdminInventoryScreen} />
      <Stack.Screen name="AdminPromotions" component={AdminPromotionsScreen} />
      <Stack.Screen name="AdminEmployees" component={AdminEmployeesScreen} />
      <Stack.Screen name="AdminDevices" component={AdminDevicesScreen} />
      <Stack.Screen name="AdminSync" component={AdminSyncScreen} />
      <Stack.Screen name="AdminDeveloper" component={AdminDeveloperScreen} />
    </Stack.Navigator>
  );
}
