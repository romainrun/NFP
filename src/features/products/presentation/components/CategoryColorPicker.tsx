import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import {
  CATEGORY_COLOR_PRESETS,
  isCategoryColorPreset,
  normalizeCategoryColor,
} from '@/features/products/domain/categoryColorPresets';
import { Colors } from '@/shared/theme/colors';
import { radii, spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  value: string;
  onChange: (color: string) => void;
};

export function CategoryColorPicker({ value, onChange }: Props) {
  const theme = useTheme();
  const normalizedValue = normalizeCategoryColor(value);
  const showCustomSwatch = value && !isCategoryColorPreset(value);

  return (
    <View style={styles.root}>
      <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
        Couleur
      </Text>
      <View style={styles.grid}>
        {showCustomSwatch ? (
          <Pressable
            onPress={() => onChange(value)}
            style={[
              styles.bubbleWrap,
              styles.bubbleWrapSelected,
              { borderColor: theme.colors.primary },
            ]}
            accessibilityLabel="Couleur actuelle"
          >
            <View style={[styles.bubble, { backgroundColor: value }]} />
          </Pressable>
        ) : null}
        {CATEGORY_COLOR_PRESETS.map((preset) => {
          const selected = normalizedValue === preset.toUpperCase();
          return (
            <Pressable
              key={preset}
              onPress={() => onChange(preset)}
              style={[
                styles.bubbleWrap,
                selected && [styles.bubbleWrapSelected, { borderColor: theme.colors.primary }],
              ]}
              accessibilityLabel={`Couleur ${preset}`}
              accessibilityState={{ selected }}
            >
              <View style={[styles.bubble, { backgroundColor: preset }]} />
            </Pressable>
          );
        })}
      </View>
      <Text style={[typography.caption, { color: theme.colors.onSurfaceVariant }]}>
        Touchez une pastille pour choisir la couleur de la catégorie.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bubbleWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bubbleWrapSelected: {
    borderWidth: 2,
  },
  bubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
});
