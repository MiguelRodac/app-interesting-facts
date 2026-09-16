import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LogLevel } from '../stores/logStore';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

interface LogEmptyStateProps {
  searchQuery: string;
  selectedLevel: LogLevel | 'all';
  totalAllCount: number;
  onSelectAll: () => void;
  onClearSearch: () => void;
}

export const LogEmptyState = React.memo(function LogEmptyState({
  searchQuery,
  selectedLevel,
  totalAllCount,
  onSelectAll,
  onClearSearch,
}: LogEmptyStateProps) {
  const theme = useTheme();
  const trimmed = searchQuery.trim();

  return (
    <View style={styles.emptyState}>
      <Ionicons
        name={trimmed ? 'search-outline' : 'terminal-outline'}
        size={44}
        color={theme.muted}
      />
      <ThemedText type="smallBold" themeColor="muted" style={styles.emptyMessage}>
        {trimmed
          ? `No se encontraron logs para "${trimmed}" en ${
              selectedLevel === 'all' ? 'todos los eventos' : selectedLevel.toUpperCase()
            }`
          : 'No hay logs registrados para este filtro'}
      </ThemedText>

      {trimmed && selectedLevel !== 'all' && totalAllCount > 0 ? (
        <AppPressable
          onPress={onSelectAll}
          style={[styles.emptyActionButton, { backgroundColor: theme.primary, marginTop: Spacing.three }]}>
          <Ionicons name="layers-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
          <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
            Buscar en Todos ({totalAllCount})
          </ThemedText>
        </AppPressable>
      ) : null}

      {trimmed ? (
        <AppPressable
          onPress={onClearSearch}
          style={[
            styles.emptyActionButton,
            { borderColor: theme.border, borderWidth: 1, marginTop: Spacing.two },
          ]}>
          <Ionicons name="close-circle-outline" size={15} color={theme.text} style={{ marginRight: 6 }} />
          <ThemedText type="smallBold" style={{ color: theme.text }}>
            Limpiar búsqueda
          </ThemedText>
        </AppPressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: Spacing.four,
  },
  emptyMessage: {
    marginTop: 12,
    textAlign: 'center',
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radii.full,
  },
});
