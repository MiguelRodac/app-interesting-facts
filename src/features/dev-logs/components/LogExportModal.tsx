import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LogLevel } from '../stores/logStore';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

interface LogExportModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalLogsCount: number;
  selectedLevel: LogLevel | 'all';
  searchQuery: string;
  isDark: boolean;
}

export const LogExportModal = React.memo(function LogExportModal({
  visible,
  onClose,
  onConfirm,
  totalLogsCount,
  selectedLevel,
  searchQuery,
  isDark,
}: LogExportModalProps) {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <View style={styles.confirmOverlay}>
      <ThemedView type="backgroundElement" style={[styles.confirmCard, { borderColor: theme.border }]}>
        <View style={[styles.confirmIconWrap, { backgroundColor: `${theme.primary}18` }]}>
          <Ionicons name="document-text-outline" size={28} color={theme.primary} />
        </View>

        <ThemedText type="subtitle" style={styles.confirmTitle}>
          Descargar archivo de logs
        </ThemedText>

        <ThemedText type="small" themeColor="textSecondary" style={styles.confirmDescription}>
          Se generará un archivo .txt estructurado con los eventos actualmente filtrados para auditoría o soporte técnico.
        </ThemedText>

        {/* Summary Box */}
        <View
          style={[
            styles.confirmSummaryBox,
            { backgroundColor: isDark ? '#0A0E18' : '#F8FAFC', borderColor: theme.border },
          ]}>
          <View style={styles.confirmSummaryRow}>
            <ThemedText type="small" themeColor="textSecondary">
              📊 Total a exportar:
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              {totalLogsCount} evento{totalLogsCount > 1 ? 's' : ''}
            </ThemedText>
          </View>

          <View style={styles.confirmSummaryRow}>
            <ThemedText type="small" themeColor="textSecondary">
              🏷️ Nivel de filtro:
            </ThemedText>
            <ThemedText type="smallBold">
              {selectedLevel === 'all' ? 'Todos' : selectedLevel.toUpperCase()}
            </ThemedText>
          </View>

          {searchQuery.trim() ? (
            <View style={styles.confirmSummaryRow}>
              <ThemedText type="small" themeColor="textSecondary">
                🔍 Término buscado:
              </ThemedText>
              <ThemedText type="smallBold" numberOfLines={1} style={{ maxWidth: 150 }}>
                {`"${searchQuery.trim()}"`}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.confirmSummaryRow}>
            <ThemedText type="small" themeColor="textSecondary">
              📁 Archivo:
            </ThemedText>
            <ThemedText type="small" style={{ fontFamily: 'monospace', fontSize: 10 }}>
              {`interesting-facts-logs-${new Date().toISOString().slice(0, 10)}.txt`}
            </ThemedText>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.confirmActions}>
          <AppPressable
            onPress={onClose}
            style={[styles.confirmBtn, styles.cancelBtn, { borderColor: theme.border }]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Cancelar
            </ThemedText>
          </AppPressable>
          <AppPressable
            onPress={onConfirm}
            style={[styles.confirmBtn, { backgroundColor: theme.primary }]}>
            <Ionicons name="download-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
              Confirmar y descargar
            </ThemedText>
          </AppPressable>
        </View>
      </ThemedView>
    </View>
  );
});

const styles = StyleSheet.create({
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
    zIndex: 2000,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radii.xl,
    padding: Spacing.four,
    borderWidth: 1,
    gap: Spacing.three,
    alignItems: 'center',
  },
  confirmIconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  confirmTitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  confirmDescription: {
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.two,
  },
  confirmSummaryBox: {
    width: '100%',
    borderRadius: Radii.md,
    padding: Spacing.three,
    borderWidth: 1,
    gap: 8,
  },
  confirmSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    width: '100%',
    marginTop: Spacing.one,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: Spacing.two + 4,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  cancelBtn: {
    borderWidth: 1,
  },
});
