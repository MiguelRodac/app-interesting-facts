import { useEffect, useRef } from 'react';
import { StyleSheet, Animated, View } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface LoadingSkeletonProps {
  count?: number;
}

function SkeletonCard() {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, opacity: pulse },
      ]}>
      <View style={[styles.skeletonLine, styles.titleLine, { backgroundColor: theme.muted }]} />
      <View style={[styles.skeletonLine, { backgroundColor: theme.muted }]} />
      <View style={[styles.skeletonLine, { width: '70%', backgroundColor: theme.muted }]} />
      <View style={styles.footer}>
        <View style={[styles.avatarCircle, { backgroundColor: theme.muted }]} />
        <View style={[styles.skeletonLine, { width: 80, backgroundColor: theme.muted }]} />
      </View>
    </Animated.View>
  );
}

export function LoadingSkeleton({ count = 3 }: LoadingSkeletonProps) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Radii.md,
    marginBottom: Spacing.two,
  },
  skeletonLine: {
    height: 14,
    borderRadius: Radii.sm,
    marginBottom: Spacing.two,
    width: '100%',
  },
  titleLine: {
    height: 18,
    width: '60%',
    marginBottom: Spacing.three,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: Spacing.two,
  },
});
