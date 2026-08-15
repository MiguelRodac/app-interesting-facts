import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface CharCounterProps {
  current: number;
  min?: number;
  max?: number;
}

function getColor(current: number, min: number, max: number): string {
  if (current < min || current > max) return '#E53935'; // red — invalid
  if (current > max - 20) return '#FB8C00'; // yellow — approaching limit
  return '#43A047'; // green — valid
}

export function CharCounter({ current, min = 10, max = 200 }: CharCounterProps) {
  const theme = useTheme();
  const color = getColor(current, min, max);
  const remaining = max - current;

  return (
    <View style={styles.container}>
      <ThemedText type="small" style={{ color }}>
        {current}/{max}
      </ThemedText>
      {current < min ? (
        <ThemedText type="small" style={[styles.hint, { color: theme.muted }]}>
          {min - current} more needed
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  hint: {
    fontSize: 12,
  },
});
