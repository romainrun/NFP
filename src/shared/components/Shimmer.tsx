import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from 'react-native-paper';
import { radii } from '@/shared/theme/spacing';

type Props = {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: ViewStyle;
};

export function ShimmerBlock({
  width = '100%',
  height,
  radius = radii.md,
  style,
}: Props) {
  const theme = useTheme();
  const progress = useSharedValue(-1);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1250 }), -1, false);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * 260 }],
  }));

  return (
    <View
      style={[
        styles.root,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: theme.colors.surfaceVariant,
        },
        style,
      ]}
    >
      <Animated.View style={[styles.highlight, animatedStyle]}>
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)',
            'rgba(255,255,255,0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 90,
  },
});
