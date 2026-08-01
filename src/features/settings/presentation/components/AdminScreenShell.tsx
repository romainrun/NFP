import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '@/shared/components/AppHeader';
import { Screen } from '@/shared/components/Screen';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onSave?: () => void;
  saving?: boolean;
  saveLabel?: string;
};

export function AdminScreenShell({
  title,
  subtitle,
  children,
  onSave,
  saving,
  saveLabel = 'Enregistrer',
}: Props) {
  const theme = useTheme();
  const navigation = useNavigation();

  return (
    <Screen padded={false} atmosphere>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
          <View style={{ flex: 1 }}>
            <AppHeader title={title} subtitle={subtitle} showMenu={false} showBrandMark />
          </View>
        </View>
        <View style={styles.body}>{children}</View>
        {onSave ? (
          <Button
            mode="contained"
            onPress={onSave}
            loading={saving}
            contentStyle={{ minHeight: 48 }}
            labelStyle={typography.button}
          >
            {saveLabel}
          </Button>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  body: {
    gap: spacing.sm,
  },
});
