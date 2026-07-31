import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';
import { spacing } from '@/shared/theme/spacing';

type Props = {
  children: ReactNode;
  padded?: boolean;
  style?: ViewStyle;
  centered?: boolean;
};

export function Screen({ children, padded = true, style, centered = false }: Props) {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.inner,
          padded && styles.padded,
          centered && styles.centered,
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  inner: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  centered: { alignItems: 'center', justifyContent: 'center' },
});
