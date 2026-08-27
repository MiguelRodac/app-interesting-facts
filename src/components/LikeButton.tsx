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
}

const SPRING_CONFIG = { damping: 10, stiffness: 200 };

export function LikeButton({ liked, likesCount, onPress, disabled = false }: LikeButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(liked ? 1 : 0.8);
  const fillProgress = useSharedValue(liked ? 1 : 0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) return;
    // The button can be embedded in a tappable card — stop the event from
    // bubbling to the card's onPress (matters on web where events bubble).
    e.stopPropagation();
    // Bounce animation: scale down then up using sequence
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
        <Ionicons name={iconName} size={22} color={iconColor} />
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
