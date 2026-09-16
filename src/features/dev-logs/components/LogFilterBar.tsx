import React from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LogLevel } from '../stores/logStore';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

export interface LogCounts {
  all: number;
  error: number;
  warn: number;
  api: number;
  info: number;
  debug: number;
}

interface LogFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedLevel: LogLevel | 'all';
  onSelectLevel: (level: LogLevel | 'all') => void;
  counts: LogCounts;
}

export const LogFilterBar = React.memo(function LogFilterBar({
  searchQuery,
  onSearchChange,
  selectedLevel,
  onSelectLevel,
  counts,
}: LogFilterBarProps) {
  const theme = useTheme();

  const filterTabs: { id: LogLevel | 'all'; label: string; color?: string }[] = [
    { id: 'all', label: `Todos (${counts.all})` },
    { id: 'error', label: `Errores (${counts.error})`, color: '#FF453A' },
    { id: 'warn', label: `Warns (${counts.warn})`, color: '#FF9F0A' },
    { id: 'api', label: `API (${counts.api})`, color: '#BF5AF2' },
    { id: 'info', label: `Info (${counts.info})`, color: '#0A84FF' },
  ];

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={[styles.searchBar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Ionicons name="search" size={16} color={theme.muted} style={styles.searchIcon} />
        <TextInput
          placeholder="Buscar por mensaje, tag, endpoint, error..."
          placeholderTextColor={theme.muted}
          value={searchQuery}
          onChangeText={onSearchChange}
          style={[styles.searchInput, { color: theme.text }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery ? (
          <AppPressable onPress={() => onSearchChange('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={theme.muted} />
          </AppPressable>
        ) : null}
      </View>

      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}>
          {filterTabs.map((filter) => {
            const isSelected = selectedLevel === filter.id;
            return (
              <AppPressable
                key={filter.id}
                onPress={() => onSelectLevel(filter.id)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.backgroundElement,
                    borderColor: isSelected
                      ? theme.primary
                      : filter.color
                        ? `${filter.color}60`
                        : theme.border,
                  },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={[
                    styles.filterPillText,
                    isSelected
                      ? { color: '#FFFFFF' }
                      : filter.color
                        ? { color: filter.color }
                        : { color: theme.muted },
                  ]}>
                  {filter.label}
                </ThemedText>
              </AppPressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: Spacing.two,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
  },
  filterContainer: {
    paddingVertical: Spacing.two,
  },
  filterScrollContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
  },
});
