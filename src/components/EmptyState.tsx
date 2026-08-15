import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function EmptyState({ title, subtitle, icon = 'document-text-outline' }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={48} color={theme.muted} style={styles.icon} />
      <ThemedText type="subtitle" style={[styles.title, { color: theme.textSecondary }]}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText type="small" style={[styles.subtitle, { color: theme.muted }]}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
  },
  icon: {
    marginBottom: Spacing.three,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  subtitle: {
    textAlign: 'center',
  },
});
