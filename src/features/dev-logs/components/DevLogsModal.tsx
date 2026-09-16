import React, { useState, useMemo, useCallback } from 'react';
import { FlatList, Platform, Share, StyleSheet, View } from 'react-native';
import { useLogStore, type LogEntry, type LogLevel } from '../stores/logStore';
import { useUIStore } from '@/shared/stores/uiStore';
import { Toast } from '@/shared/ui/Toast';
import { AppModal } from '@/shared/ui/app-modal';
import { ThemedView } from '@/shared/ui/themed-view';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { useTopInset } from '@/shared/hooks/use-top-inset';
import { useBottomInset } from '@/shared/hooks/use-bottom-inset';

import { formatTime, copyToClipboard, formatLogsForExport } from '../utils/logFormatters';
import { normalizeSearchText, getSearchTokens, matchLog } from '../utils/logSearch';
import { LogModalHeader } from './LogModalHeader';
import { LogFilterBar, type LogCounts } from './LogFilterBar';
import { LogItem } from './LogItem';
import { LogEmptyState } from './LogEmptyState';
import { LogExportModal } from './LogExportModal';

interface DevLogsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function DevLogsModal({ visible, onClose }: DevLogsModalProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const topInset = useTopInset();
  const bottomInset = useBottomInset();
  const logs = useLogStore((s) => s.logs);
  const clearLogs = useLogStore((s) => s.clearLogs);
  const showConfirm = useUIStore((s) => s.showConfirm);
  const showToast = useUIStore((s) => s.showToast);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [confirmExportVisible, setConfirmExportVisible] = useState(false);

  const counts: LogCounts = useMemo(() => {
    const res: LogCounts = { all: 0, error: 0, warn: 0, api: 0, info: 0, debug: 0 };
    const query = searchQuery.trim();
    const normQuery = query ? normalizeSearchText(query) : '';
    const tokens = query ? getSearchTokens(query) : [];

    for (const log of logs) {
      const matches = query ? matchLog(log, tokens, normQuery) : true;
      if (matches) {
        res.all++;
        if (res[log.level] !== undefined) {
          res[log.level]++;
        }
        if (log.tag && log.tag.toUpperCase().startsWith('API') && log.level !== 'api') {
          res.api++;
        }
      }
    }
    return res;
  }, [logs, searchQuery]);

  const filteredLogs = useMemo(() => {
    let list = logs;
    if (selectedLevel !== 'all') {
      if (selectedLevel === 'api') {
        list = list.filter((l) => l.level === 'api' || (l.tag && l.tag.toUpperCase().startsWith('API')));
      } else {
        list = list.filter((l) => l.level === selectedLevel);
      }
    }
    const query = searchQuery.trim();
    if (query) {
      const normQuery = normalizeSearchText(query);
      const tokens = getSearchTokens(query);
      list = list.filter((l) => matchLog(l, tokens, normQuery));
    }
    return list;
  }, [logs, selectedLevel, searchQuery]);

  const handleClear = useCallback(() => {
    if (logs.length === 0) return;
    showConfirm({
      title: '¿Vaciar todos los logs?',
      message: `Se eliminarán los ${logs.length} eventos almacenados en memoria durante esta sesión.`,
      confirmLabel: 'Vaciar Logs',
      cancelLabel: 'Cancelar',
      destructive: true,
      onConfirm: () => {
        clearLogs();
        showToast('Logs vaciados', 'info');
      },
    });
  }, [logs.length, showConfirm, clearLogs, showToast]);

  const handleCopyAll = useCallback(async () => {
    if (filteredLogs.length === 0) {
      showToast('No hay logs para copiar', 'warning');
      return;
    }
    const text = filteredLogs
      .map(
        (l) =>
          `[${formatTime(l.timestamp)}] [${l.level.toUpperCase()}] ${l.tag ? `[${l.tag}] ` : ''}${l.message}${
            l.details ? `\nDetails: ${l.details}` : ''
          }`
      )
      .join('\n---\n');

    const ok = await copyToClipboard(text);
    if (ok) {
      showToast(`${filteredLogs.length} logs copiados`, 'success');
    } else {
      showToast('Error al copiar', 'warning');
    }
  }, [filteredLogs, showToast]);

  const executeExportLogs = useCallback(async () => {
    if (filteredLogs.length === 0) return;

    const exportText = formatLogsForExport(filteredLogs, selectedLevel, searchQuery.trim());
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `interesting-facts-logs-${dateStamp}.txt`;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        showToast(`Archivo descargado (${filteredLogs.length} logs)`, 'success');
        return;
      } catch (err) {
        console.error('Error downloading logs blob on web:', err);
      }
    }

    try {
      await Share.share({ title: filename, message: exportText });
      showToast(`Compartiendo ${filteredLogs.length} logs`, 'info');
    } catch {
      const ok = await copyToClipboard(exportText);
      if (ok) {
        showToast('Logs copiados al portapapeles', 'success');
      } else {
        showToast('Error al exportar los logs', 'warning');
      }
    }
  }, [filteredLogs, selectedLevel, searchQuery, showToast]);

  const handleExportLogs = useCallback(() => {
    if (filteredLogs.length === 0) {
      showToast('No hay logs para exportar', 'warning');
      return;
    }
    setConfirmExportVisible(true);
  }, [filteredLogs.length, showToast]);

  const handleCopySingle = useCallback(
    async (entry: LogEntry) => {
      const text = `[${formatTime(entry.timestamp)}] [${entry.level.toUpperCase()}] ${entry.tag ? `[${entry.tag}] ` : ''}${entry.message}${
        entry.details ? `\nDetails: ${entry.details}` : ''
      }`;
      const ok = await copyToClipboard(text);
      if (ok) {
        showToast('Log copiado', 'success');
      } else {
        showToast('Error al copiar', 'warning');
      }
    },
    [showToast]
  );

  const handleCopyText = useCallback(
    async (text: string, msg: string) => {
      await copyToClipboard(text);
      showToast(msg, 'success');
    },
    [showToast]
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const renderLogItem = useCallback(
    ({ item }: { item: LogEntry }) => (
      <LogItem
        item={item}
        expandedIds={expandedIds}
        onToggleExpand={toggleExpand}
        onCopySingle={handleCopySingle}
        onCopyText={handleCopyText}
        isDark={isDark}
      />
    ),
    [expandedIds, toggleExpand, handleCopySingle, handleCopyText, isDark]
  );

  return (
    <AppModal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ThemedView
        style={[
          styles.safeArea,
          {
            paddingTop: topInset,
            paddingBottom: Math.max(Spacing.four, bottomInset),
          },
        ]}>
        <View style={styles.responsiveContainer}>
          <LogModalHeader
            filteredCount={filteredLogs.length}
            totalCount={logs.length}
            onCopyAll={handleCopyAll}
            onExportLogs={handleExportLogs}
            onClearLogs={handleClear}
            onClose={onClose}
          />

          <LogFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedLevel={selectedLevel}
            onSelectLevel={setSelectedLevel}
            counts={counts}
          />

          <FlatList
            data={filteredLogs}
            renderItem={renderLogItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <LogEmptyState
                searchQuery={searchQuery}
                selectedLevel={selectedLevel}
                totalAllCount={counts.all}
                onSelectAll={() => setSelectedLevel('all')}
                onClearSearch={() => setSearchQuery('')}
              />
            }
          />
        </View>

        <LogExportModal
          visible={confirmExportVisible}
          onClose={() => setConfirmExportVisible(false)}
          onConfirm={async () => {
            setConfirmExportVisible(false);
            await executeExportLogs();
          }}
          totalLogsCount={filteredLogs.length}
          selectedLevel={selectedLevel}
          searchQuery={searchQuery}
          isDark={isDark}
        />

        {Platform.OS !== 'web' && <Toast />}
      </ThemedView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  responsiveContainer: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  listContent: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
});
