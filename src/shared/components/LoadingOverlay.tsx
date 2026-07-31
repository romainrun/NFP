import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { Screen } from '@/shared/components/Screen';
import { spacing } from '@/shared/theme/spacing';

type Props = {
  label?: string;
};

export function LoadingOverlay({ label = 'Chargement…' }: Props) {
  const theme = useTheme();

  return (
    <Screen centered padded={false}>
      <View style={styles.wrap}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: spacing.md, color: theme.colors.onSurfaceVariant }}>
          {label}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
