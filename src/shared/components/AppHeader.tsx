import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { DrawerParamList } from '@/navigation/types';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  showMenu?: boolean;
};

export function AppHeader({ title, subtitle, right, showMenu = true }: Props) {
  const theme = useTheme();
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();

  return (
    <View style={styles.row}>
      {showMenu ? (
        <IconButton
          icon="menu"
          size={26}
          onPress={() => navigation.openDrawer()}
          accessibilityLabel="Ouvrir le menu"
        />
      ) : null}
      <View style={styles.titles}>
        <Text style={[typography.h2, { color: theme.colors.onSurface }]}>{title}</Text>
        {subtitle ? (
          <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginBottom: spacing.sm,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
