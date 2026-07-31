import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { Screen } from '@/shared/components/Screen';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  title?: string;
  message?: string;
  onRetry: () => void;
  padded?: boolean;
};

export function QueryErrorPanel({
  title = 'Chargement impossible',
  message = 'Une erreur s’est produite. Vérifiez la connexion ou réessayez.',
  onRetry,
  padded = true,
}: Props) {
  const theme = useTheme();

  return (
    <Screen centered padded={padded}>
      <View style={styles.wrap}>
        <Text style={[typography.h3, { color: theme.colors.onSurface, textAlign: 'center' }]}>
          {title}
        </Text>
        <Text
          style={[
            typography.body,
            { color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: spacing.sm },
          ]}
        >
          {message}
        </Text>
        <Button mode="contained" onPress={onRetry} style={{ marginTop: spacing.lg }}>
          Réessayer
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    maxWidth: 360,
  },
});
