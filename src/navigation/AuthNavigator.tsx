import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PinLoginScreen } from '@/features/authentication/presentation/screens/PinLoginScreen';
import type { AuthStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="PinLogin" component={PinLoginScreen} />
    </Stack.Navigator>
  );
}
