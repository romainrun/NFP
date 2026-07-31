import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { BootstrapSkeleton } from '@/shared/components/skeletons';
import { spacing } from '@/shared/theme/spacing';

type Props = {
  label?: string;
  variant?: 'bootstrap' | 'minimal';
};

export function LoadingOverlay({ label, variant = 'bootstrap' }: Props) {
  const theme = useTheme();

  if (variant === 'minimal' && label) {
    return (
      <View style={[styles.wrap, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { backgroundColor: theme.colors.background }]}>
      <BootstrapSkeleton />
      {label ? (
        <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  label: {
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
});
