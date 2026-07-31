import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { useDrawerStore } from '@/navigation/drawerStore';
import { Colors } from '@/shared/theme/colors';
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
  const open = useDrawerStore((s) => s.open);

  return (
    <View style={styles.row}>
      {showMenu ? (
        <IconButton
          icon="menu"
          size={26}
          iconColor={Colors.iconActive}
          onPress={open}
          accessibilityLabel="Ouvrir le menu"
        />
      ) : null}
      <View style={styles.titles}>
        <Text style={[typography.h2, { color: theme.colors.onSurface }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={2}
          >
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
