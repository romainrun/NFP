import type { ReactNode } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type Props = Omit<PressableProps, 'style'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  children,
  style,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  ...props
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pressIn = (event: GestureResponderEvent) => {
    scale.value = withSpring(scaleTo, { damping: 14, stiffness: 280 });
    onPressIn?.(event);
  };

  const pressOut = (event: GestureResponderEvent) => {
    scale.value = withSpring(1, { damping: 14, stiffness: 280 });
    onPressOut?.(event);
  };

  return (
    <AnimatedPressableBase
      {...props}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressableBase>
  );
}
