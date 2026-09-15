import { useRef } from 'react';
import { StyleSheet, type GestureResponderEvent } from 'react-native';
import { AppPressable } from '@/components/ui/app-pressable';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface LikeButtonProps {
  liked: boolean;
  likesCount: number;
  onPress?: () => void;
  disabled?: boolean;
  size?: number;
}

const SPRING_CONFIG = { damping: 10, stiffness: 200 };

export function LikeButton({ liked, likesCount, onPress, disabled = false, size = 22 }: LikeButtonProps) {
  const theme = useTheme();
  const lastPressRef = useRef(0);
  const scale = useSharedValue(liked ? 1 : 0.8);
  const fillProgress = useSharedValue(liked ? 1 : 0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) return;
    // Guard against rapid duplicate taps (400ms throttle)
    const now = Date.now();
    if (now - lastPressRef.current < 400) return;
    lastPressRef.current = now;

    // The button can be embedded in a tappable card — stop the event from
    // bubbling to the card's onPress (matters on web where events bubble).
    e.stopPropagation();
    // Bounce animation: scale down then up using sequence
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withSequence(
      withSpring(0.8, SPRING_CONFIG),
      withSpring(1, SPRING_CONFIG),
    );
    fillProgress.value = withTiming(liked ? 0 : 1, { duration: 200 });
    onPress?.();
  };

  const iconName: keyof typeof Ionicons.glyphMap = liked ? 'heart' : 'heart-outline';
  const iconColor = liked ? theme.destructive : theme.muted;

  return (
    <AppPressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={Spacing.two}
      style={styles.container}>
      <Animated.View style={animatedStyle}>
        <Ionicons name={iconName} size={size} color={iconColor} />
      </Animated.View>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.one,
  },
});
