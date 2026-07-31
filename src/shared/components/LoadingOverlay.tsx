import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, useTheme } from 'react-native-paper';
import { BootstrapSkeleton } from '@/shared/components/skeletons';
import { Screen } from '@/shared/components/Screen';
import { BRAND } from '@/shared/theme/brand';
import { brandGradient, Colors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  label?: string;
  variant?: 'bootstrap' | 'minimal';
};

export function LoadingOverlay({ label, variant = 'bootstrap' }: Props) {
  const theme = useTheme();

  if (variant === 'minimal' && label) {
    return (
      <Screen centered padded={false} atmosphere>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      </Screen>
    );
  }

  return (
    <Screen centered padded={false} atmosphere>
      <View style={styles.wrap}>
        <LinearGradient
          colors={[...brandGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.brandBadge}
        >
          <Text style={[typography.brand, { color: Colors.white, fontSize: 28 }]}>
            {BRAND.shortName}
          </Text>
        </LinearGradient>
        <BootstrapSkeleton />
        <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
          {label ?? BRAND.tagline}
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
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  brandBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
});
