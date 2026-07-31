import type { ReactNode } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND } from '@/shared/theme/brand';
import { brandGradient, Colors, shadows } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  logoSource?: ImageSourcePropType;
  children?: ReactNode;
  compact?: boolean;
  style?: ViewStyle;
};

export function BrandHero({
  title = BRAND.name,
  subtitle = BRAND.tagline,
  eyebrow,
  logoSource,
  children,
  compact = false,
  style,
}: Props) {
  return (
    <LinearGradient
      colors={[...brandGradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, compact && styles.heroCompact, shadows.md, style]}
    >
      {logoSource ? (
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
      ) : null}
      {eyebrow ? (
        <Text style={[typography.caption, styles.eyebrow]}>{eyebrow.toUpperCase()}</Text>
      ) : null}
      <Text style={[typography.brand, styles.title, compact && styles.titleCompact]}>{title}</Text>
      {subtitle ? (
        <Text style={[typography.subtitle, styles.subtitle]} numberOfLines={2}>{subtitle}</Text>
      ) : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radii.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  heroCompact: {
    paddingVertical: spacing.md,
  },
  logo: {
    width: 120,
    height: 40,
    marginBottom: spacing.xs,
  },
  eyebrow: {
    color: Colors.white,
    opacity: 0.85,
    letterSpacing: 1.2,
    fontSize: 11,
  },
  title: {
    color: Colors.white,
    fontSize: 32,
  },
  titleCompact: {
    fontSize: 26,
  },
  subtitle: {
    color: Colors.white,
    opacity: 0.92,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
});
