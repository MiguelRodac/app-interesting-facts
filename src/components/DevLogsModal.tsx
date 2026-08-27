import React, { useState, useMemo, useCallback } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  View,
  SafeAreaView,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useLogStore, type LogEntry, type LogLevel } from '@/data/stores/logStore';
import { AppPressable } from '@/components/ui/app-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface DevLogsModalProps {
  visible: boolean;
  onClose: () => void;
}

const LEVEL_COLORS: Record<LogLevel, { bg: string; text: string; label: string }> = {
  error: { bg: '#FF3B3020', text: '#FF453A', label: 'ERR' },
  warn: { bg: '#FF950020', text: '#FF9F0A', label: 'WARN' },
  api: { bg: '#AF52DE20', text: '#BF5AF2', label: 'API' },
  info: { bg: '#0A84FF20', text: '#0A84FF', label: 'INFO' },
  debug: { bg: '#8E8E9320', text: '#98989D', label: 'DBG' },
};

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

export function DevLogsModal({ visible, onClose }: DevLogsModalProps) {
  const theme = useTheme();
  const logs = useLogStore((s) => s.logs);
  const clearLogs = useLogStore((s) => s.clearLogs);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmClearVisible, setConfirmClearVisible] = useState(false);

  const showFeedbackToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  const counts = useMemo(() => {
    const res = { all: logs.length, error: 0, warn: 0, api: 0, info: 0, debug: 0 };
    for (const log of logs) {
      if (res[log.level] !== undefined) {
        res[log.level]++;
      }
    }
    return res;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let list = logs;
    if (selectedLevel !== 'all') {
      list = list.filter((l) => l.level === selectedLevel);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          (l.tag && l.tag.toLowerCase().includes(q)) ||
          (l.details && l.details.toLowerCase().includes(q))
      );
    }
    return list;
  }, [logs, selectedLevel, searchQuery]);

  const handleClear = () => {
    if (logs.length === 0) return;
    setConfirmClearVisible(true);
  };

  const handleCopyAll = async () => {
    if (logs.length === 0) return;
    const text = logs
      .map(
        (l) =>
          `[${formatTime(l.timestamp)}] [${l.level.toUpperCase()}] ${l.tag ? `[${l.tag}] ` : ''}${l.message}${
            l.details ? `\nDetails: ${l.details}` : ''
          }`
      )
      .join('\n---\n');

    await Clipboard.setStringAsync(text);
    showFeedbackToast('✓ Copiado todo');
  };

  const handleCopySingle = async (entry: LogEntry) => {
    const text = `[${formatTime(entry.timestamp)}] [${entry.level.toUpperCase()}] ${entry.tag ? `[${entry.tag}] ` : ''}${entry.message}${
      entry.details ? `\nDetails: ${entry.details}` : ''
    }`;
    await Clipboard.setStringAsync(text);
    showFeedbackToast('✓ Log copiado');
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderLogItem = useCallback(
    ({ item }: { item: LogEntry }) => {
      const isExpanded = !!expandedIds[item.id];
      const levelStyle = LEVEL_COLORS[item.level] || LEVEL_COLORS.info;

      return (
        <ThemedView type="backgroundElement" style={styles.logCard}>
          <AppPressable onPress={() => handleCopySingle(item)} style={styles.logHeader}>
            <View style={styles.headerLeft}>
              <View style={[styles.badge, { backgroundColor: levelStyle.bg }]}>
                <ThemedText type="smallBold" style={{ color: levelStyle.text, fontSize: 10 }}>
                  {levelStyle.label}
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.timestamp}>
                {formatTime(item.timestamp)}
              </ThemedText>
              {item.tag && (
                <View style={styles.tagBadge}>
                  <ThemedText type="smallBold" style={styles.tagText}>
                    {item.tag}
                  </ThemedText>
                </View>
              )}
            </View>
            <Ionicons name="copy-outline" size={14} color={theme.muted} />
          </AppPressable>

          <ThemedText type="default" style={styles.messageText} selectable>
            {item.message}
          </ThemedText>

          {item.details && (
            <View style={styles.detailsContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppPressable onPress={() => toggleExpand(item.id)} style={styles.detailsToggle}>
                  <Ionicons
                    name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                    size={14}
                    color={item.level === 'error' ? '#FF453A' : theme.primary}
                  />
                  <ThemedText
                    type="smallBold"
                    style={{
                      color: item.level === 'error' ? '#FF453A' : theme.primary,
                      fontSize: 12,
                    }}>
                    {isExpanded
                      ? 'Ocultar detalles'
                      : item.level === 'error'
                        ? '🔍 Ver detalle completo del error'
                        : '🔍 Ver payload / request'}
                  </ThemedText>
                </AppPressable>
                {isExpanded && (
                  <AppPressable
                    onPress={async () => {
                      if (item.details) {
                        await Clipboard.setStringAsync(item.details);
                        showFeedbackToast('✓ Detalles copiados');
                      }
                    }}
                    hitSlop={8}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}>
                    <Ionicons name="copy-outline" size={12} color="#8E8E93" />
                    <ThemedText type="small" style={{ color: '#8E8E93', fontSize: 11 }}>
                      Copiar JSON
                    </ThemedText>
                  </AppPressable>
                )}
              </View>

              {isExpanded && (
                <View style={[styles.payloadBox, item.level === 'error' && { borderColor: '#FF453A40' }]}>
                  <ThemedText
                    type="small"
                    style={[styles.payloadText, item.level === 'error' && { color: '#FF9F0A' }]}
                    selectable>
                    {item.details}
                  </ThemedText>
                </View>
              )}
            </View>
          )}
        </ThemedView>
      );
    },
    [expandedIds, theme]
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#0B0F19' }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText type="subtitle" style={{ color: '#FFFFFF' }}>
              🛠️ Developer Logs
            </ThemedText>
            <ThemedText type="small" style={{ color: '#8E8E93' }}>
              {logs.length} eventos en memoria
            </ThemedText>
          </View>

          <View style={styles.headerActions}>
            {toastMessage && (
              <View style={styles.toast}>
                <ThemedText type="smallBold" style={{ color: '#30D158', fontSize: 11 }}>
                  {toastMessage}
                </ThemedText>
              </View>
            )}
            <AppPressable onPress={handleCopyAll} style={styles.iconButton}>
              <Ionicons name="copy-outline" size={20} color="#0A84FF" />
            </AppPressable>
            <AppPressable onPress={handleClear} style={styles.iconButton}>
              <Ionicons name="trash-outline" size={20} color="#FF453A" />
            </AppPressable>
            <AppPressable onPress={onClose} style={styles.iconButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </AppPressable>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar por mensaje, tag o error..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery ? (
            <AppPressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#8E8E93" />
            </AppPressable>
          ) : null}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(
            [
              { id: 'all' as const, label: `Todos (${counts.all})`, color: undefined },
              { id: 'error' as const, label: `Errores (${counts.error})`, color: '#FF453A' },
              { id: 'warn' as const, label: `Warns (${counts.warn})`, color: '#FF9F0A' },
              { id: 'api' as const, label: `API (${counts.api})`, color: '#BF5AF2' },
              { id: 'info' as const, label: `Info (${counts.info})`, color: '#0A84FF' },
            ]
          ).map((filter) => {
            const isSelected = selectedLevel === filter.id;
            return (
              <AppPressable
                key={filter.id}
                onPress={() => setSelectedLevel(filter.id)}
                style={[
                  styles.filterPill,
                  isSelected && styles.filterPillSelected,
                  filter.color && !isSelected ? { borderColor: `${filter.color}50` } : undefined,
                ]}>
                <ThemedText
                  type="smallBold"
                  style={[
                    styles.filterPillText,
                    isSelected ? { color: '#FFFFFF' } : filter.color ? { color: filter.color } : { color: '#8E8E93' },
                  ]}>
                  {filter.label}
                </ThemedText>
              </AppPressable>
            );
          })}
        </View>

        {/* Logs list */}
        <FlatList
          data={filteredLogs}
          renderItem={renderLogItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="terminal-outline" size={48} color="#48484A" />
              <ThemedText type="smallBold" style={{ color: '#8E8E93', marginTop: 12 }}>
                No hay logs registrados para este filtro
              </ThemedText>
            </View>
          }
        />

        {/* Custom in-app Confirmation Modal */}
        <Modal
          visible={confirmClearVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmClearVisible(false)}>
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmIconContainer}>
                <Ionicons name="trash" size={28} color="#FF453A" />
              </View>
              <ThemedText type="subtitle" style={styles.confirmTitle}>
                ¿Vaciar todos los logs?
              </ThemedText>
              <ThemedText type="small" style={styles.confirmMessage}>
                Se eliminarán los {logs.length} eventos almacenados en memoria durante esta sesión.
              </ThemedText>
              <View style={styles.confirmActions}>
                <AppPressable
                  onPress={() => setConfirmClearVisible(false)}
                  style={styles.confirmCancelBtn}>
                  <ThemedText type="smallBold" style={{ color: '#8E8E93' }}>
                    Cancelar
                  </ThemedText>
                </AppPressable>
                <AppPressable
                  onPress={() => {
                    setConfirmClearVisible(false);
                    clearLogs();
                    showFeedbackToast('🗑️ Logs vaciados');
                  }}
                  style={styles.confirmDeleteBtn}>
                  <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
                    Vaciar Logs
                  </ThemedText>
                </AppPressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#1C2436',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconButton: {
    padding: Spacing.two,
    borderRadius: Radii.sm,
    backgroundColor: '#161D2F',
  },
  toast: {
    backgroundColor: '#30D15820',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161D2F',
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: '#242F48',
  },
  searchIcon: {
    marginRight: Spacing.two,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#FFFFFF',
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  filterPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: '#242F48',
    backgroundColor: '#161D2F',
  },
  filterPillSelected: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  filterPillText: {
    fontSize: 12,
  },
  listContent: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  logCard: {
    backgroundColor: '#131A29',
    borderRadius: Radii.md,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#1F293D',
    gap: Spacing.two,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  timestamp: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  tagBadge: {
    backgroundColor: '#242F48',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  tagText: {
    color: '#A0AEC0',
    fontSize: 10,
  },
  messageText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  detailsContainer: {
    marginTop: 4,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  payloadBox: {
    backgroundColor: '#0A0E18',
    borderRadius: Radii.sm,
    padding: Spacing.three,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  payloadText: {
    color: '#38BDF8',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#131A29',
    borderRadius: Radii.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#242F48',
    gap: Spacing.two,
  },
  confirmIconContainer: {
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: Radii.full,
    backgroundColor: '#FF453A20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  confirmTitle: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  confirmMessage: {
    color: '#A0AEC0',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.two,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: Spacing.two + 4,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: '#2D3748',
    backgroundColor: '#1A202C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: Spacing.two + 4,
    borderRadius: Radii.md,
    backgroundColor: '#E53E3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
