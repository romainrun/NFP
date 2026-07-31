import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { spacing } from '@/shared/theme/spacing';

type Props = {
  label?: string;
};

export function LoadingOverlay({ label = 'Chargement…' }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={{ marginTop: spacing.md, color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
