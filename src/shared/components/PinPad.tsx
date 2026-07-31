import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { radii, spacing, touchTarget } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  value: string;
  maxLength: number;
  onChange: (next: string) => void;
  disabled?: boolean;
};

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
] as const;

function KeyButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!label) {
    return <View style={styles.keyPlaceholder} />;
  }

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPressIn={() => {
          scale.value = withSpring(0.94, { damping: 16, stiffness: 280 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 280 });
        }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.key,
          {
            backgroundColor: theme.colors.surfaceVariant,
            opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[typography.h2, { color: theme.colors.onSurface }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function PinPad({ value, maxLength, onChange, disabled }: Props) {
  const theme = useTheme();

  const append = (digit: string) => {
    if (value.length >= maxLength) return;
    onChange(value + digit);
  };

  const backspace = () => {
    onChange(value.slice(0, -1));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.dots}>
        {Array.from({ length: maxLength }).map((_, index) => {
          const filled = index < value.length;
          return (
            <View
              key={`dot-${index}`}
              style={[
                styles.dot,
                {
                  borderColor: theme.colors.outline,
                  backgroundColor: filled ? theme.colors.primary : 'transparent',
                },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.grid}>
        {KEYS.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((key) => (
              <KeyButton
                key={`${rowIndex}-${key || 'blank'}`}
                label={key}
                disabled={disabled}
                onPress={() => {
                  if (key === '⌫') backspace();
                  else if (key) append(key);
                }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 360, alignSelf: 'center', gap: spacing.lg },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: touchTarget.min,
    alignItems: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  grid: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  key: {
    width: touchTarget.pinKey,
    height: touchTarget.pinKey,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPlaceholder: {
    width: touchTarget.pinKey,
    height: touchTarget.pinKey,
  },
});
