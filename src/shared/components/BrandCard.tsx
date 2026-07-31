import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Colors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  accent?: boolean;
  padded?: boolean;
};

/** White surface card with soft elevation — matches nf.tikilote.re product tiles. */
export function BrandCard({ children, style, accent = false, padded = true }: Props) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        shadows.sm,
        padded && styles.padded,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        },
        accent && styles.accent,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.md,
  },
  accent: {
    borderTopWidth: 3,
    borderTopColor: Colors.primary,
  },
});
