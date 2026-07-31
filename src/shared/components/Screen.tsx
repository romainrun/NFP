import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';
import { darkColors, lightColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';

type Props = {
  children: ReactNode;
  padded?: boolean;
  style?: ViewStyle;
  centered?: boolean;
  /** Optional soft atmospheric gradient. Default stays flat for readability. */
  atmosphere?: boolean;
};

export function Screen({
  children,
  padded = true,
  style,
  centered = false,
  atmosphere = false,
}: Props) {
  const theme = useTheme();
  const tokens = theme.dark ? darkColors : lightColors;

  return (
    <View style={styles.root}>
      {atmosphere ? (
        <LinearGradient
          colors={[
            tokens.gradientTop,
            tokens.gradientBottom,
            tokens.background,
          ]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: tokens.background }]}
        />
      )}
      <SafeAreaView style={styles.safe}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  inner: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  centered: { alignItems: 'center', justifyContent: 'center' },
});
