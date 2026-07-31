import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { BootstrapSkeleton } from '@/shared/components/skeletons';
import { Screen } from '@/shared/components/Screen';
import { spacing } from '@/shared/theme/spacing';

type Props = {
  label?: string;
  variant?: 'bootstrap' | 'minimal';
};

export function LoadingOverlay({ label, variant = 'bootstrap' }: Props) {
  const theme = useTheme();

  if (variant === 'minimal' && label) {
    return (
      <Screen centered padded={false}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      </Screen>
    );
  }

  return (
    <Screen centered padded={false}>
      <View style={styles.wrap}>
        <BootstrapSkeleton />
        {label ? (
          <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        ) : null}
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
  label: {
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
});
