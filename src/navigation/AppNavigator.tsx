import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '@/features/dashboard/presentation/screens/DashboardScreen';
import type { AppStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * Authenticated shell. Drawer / rail navigation for POS modules arrives next phase.
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
    </Stack.Navigator>
  );
}
