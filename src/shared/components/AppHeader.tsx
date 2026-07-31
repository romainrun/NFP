import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { useDrawerStore } from '@/navigation/drawerStore';
import { BRAND } from '@/shared/theme/brand';
import { Colors } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  showMenu?: boolean;
  showBrandMark?: boolean;
};

export function AppHeader({
  title,
  subtitle,
  right,
  showMenu = true,
  showBrandMark = false,
}: Props) {
  const theme = useTheme();
  const open = useDrawerStore((s) => s.open);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {showMenu ? (
          <IconButton
            icon="menu"
            size={26}
            iconColor={Colors.primary}
            onPress={open}
            accessibilityLabel="Ouvrir le menu"
            style={styles.menuBtn}
          />
        ) : null}
        <View style={styles.titles}>
          {showBrandMark ? (
            <Text style={[typography.tagline, { color: theme.colors.primary }]}>
              {BRAND.name}
            </Text>
          ) : null}
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
          <View style={[styles.accentBar, { backgroundColor: theme.colors.primary }]} />
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  menuBtn: {
    margin: 0,
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
  accentBar: {
    height: 3,
    borderRadius: radii.pill,
    width: 40,
    marginTop: spacing.xs,
  },
});
