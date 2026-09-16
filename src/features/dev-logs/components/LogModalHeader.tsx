import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

interface LogModalHeaderProps {
  filteredCount: number;
  totalCount: number;
  onCopyAll: () => void;
  onExportLogs: () => void;
  onClearLogs: () => void;
  onClose: () => void;
}

export const LogModalHeader = React.memo(function LogModalHeader({
  filteredCount,
  totalCount,
  onCopyAll,
  onExportLogs,
  onClearLogs,
  onClose,
}: LogModalHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.header, { borderBottomColor: theme.border }]}>
      <View style={styles.headerTitleWrap}>
        <ThemedText type="subtitle">
          🛠️ Developer Logs
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {filteredCount === totalCount
            ? `${totalCount} eventos en memoria`
            : `${filteredCount} de ${totalCount} eventos`}
        </ThemedText>
      </View>

      <View style={styles.headerActions}>
        <AppPressable
          onPress={onCopyAll}
          style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]}
          accessibilityLabel="Copiar logs filtrados">
          <Ionicons name="copy-outline" size={18} color={theme.primary} />
        </AppPressable>
        <AppPressable
          onPress={onExportLogs}
          style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]}
          accessibilityLabel="Exportar logs a archivo .txt">
          <Ionicons name="download-outline" size={18} color={theme.primary} />
        </AppPressable>
        <AppPressable
          onPress={onClearLogs}
          style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]}
          accessibilityLabel="Vaciar logs">
          <Ionicons name="trash-outline" size={18} color="#FF453A" />
        </AppPressable>
        <AppPressable
          onPress={onClose}
          style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]}
          accessibilityLabel="Cerrar modal">
          <Ionicons name="close" size={20} color={theme.text} />
        </AppPressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flex: 1,
    gap: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconButton: {
    padding: Spacing.two,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
