import React, { useState, useMemo, useCallback } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useLogStore, type LogEntry, type LogLevel } from '@/data/stores/logStore';
import { useUIStore } from '@/data/stores/uiStore';
import { AppModal } from '@/components/ui/app-modal';
import { AppPressable } from '@/components/ui/app-pressable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTopInset } from '@/hooks/use-top-inset';
import { useBottomInset } from '@/hooks/use-bottom-inset';

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

interface ParsedApiDetails {
  _type?: string;
  headers?: Record<string, string>;
  request?: {
    method?: string;
    path?: string;
    fullUrl?: string;
    queryParams?: Record<string, string>;
    body?: unknown;
  };
  response?: {
    status?: number | string;
    duration?: string;
    body?: unknown;
    error?: unknown;
  };
}

function tryParseApiLog(details?: string): ParsedApiDetails | null {
  if (!details) return null;
  try {
    const parsed = JSON.parse(details);
    if (parsed && typeof parsed === 'object') {
      if (parsed._type === 'api' || parsed.headers !== undefined || (parsed.request && parsed.response)) {
        return parsed as ParsedApiDetails;
      }
    }
  } catch {}
  return null;
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

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    showConfirm({
      title: '¿Vaciar todos los logs?',
      message: `Se eliminarán los ${logs.length} eventos almacenados en memoria durante esta sesión.`,
      confirmLabel: 'Vaciar Logs',
      cancelLabel: 'Cancelar',
      destructive: true,
      onConfirm: () => {
        clearLogs();
        showFeedbackToast('🗑️ Logs vaciados');
      },
    });
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
      const apiData = tryParseApiLog(item.details);

      const isHeadersExpanded = !!expandedIds[`${item.id}:headers`];
      const isRequestExpanded = !!expandedIds[`${item.id}:request`];
      const isPayloadExpanded = !!expandedIds[`${item.id}:payload`];
      const isResponseExpanded = !!expandedIds[`${item.id}:response`];

      return (
        <ThemedView type="backgroundElement" style={[styles.logCard, { borderColor: theme.border }]}>
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
                <View style={[styles.tagBadge, { backgroundColor: isDark ? '#242F48' : '#E2E8F0' }]}>
                  <ThemedText type="smallBold" style={[styles.tagText, { color: isDark ? '#A0AEC0' : '#4A5568' }]}>
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
              {apiData ? (
                /* Multi-accordion for API logs: Headers, Request, Response */
                <View style={{ gap: 6, marginTop: 4 }}>
                  {/* 1. Headers Accordion */}
                  {apiData.headers && (
                    <View style={[styles.subAccordionCard, { backgroundColor: isDark ? '#0E1422' : '#F1F5F9', borderColor: theme.border }]}>
                      <View style={styles.subAccordionHeader}>
                        <AppPressable
                          onPress={() => toggleExpand(`${item.id}:headers`)}
                          style={styles.subAccordionToggle}>
                          <Ionicons
                            name={isHeadersExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={13}
                            color="#38BDF8"
                          />
                          <ThemedText type="smallBold" style={{ color: '#38BDF8', fontSize: 12 }}>
                            📋 Headers
                          </ThemedText>
                          <View style={[styles.subBadge, { backgroundColor: '#38BDF820' }]}>
                            <ThemedText type="smallBold" style={{ color: '#38BDF8', fontSize: 10 }}>
                              {Object.keys(apiData.headers).length}
                            </ThemedText>
                          </View>
                        </AppPressable>
                        {isHeadersExpanded && (
                          <AppPressable
                            onPress={async () => {
                              await Clipboard.setStringAsync(JSON.stringify(apiData.headers, null, 2));
                              showFeedbackToast('✓ Headers copiados');
                            }}
                            hitSlop={8}
                            style={styles.subCopyBtn}>
                            <Ionicons name="copy-outline" size={11} color={theme.muted} />
                            <ThemedText type="small" style={{ color: theme.muted, fontSize: 10 }}>
                              Copiar
                            </ThemedText>
                          </AppPressable>
                        )}
                      </View>
                      {isHeadersExpanded && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                          <View style={[styles.payloadBox, { backgroundColor: isDark ? '#0A0E18' : '#FFFFFF', borderColor: theme.border }]}>
                            <ThemedText type="small" style={styles.payloadText} selectable>
                              {JSON.stringify(apiData.headers, null, 2)}
                            </ThemedText>
                          </View>
                        </ScrollView>
                      )}
                    </View>
                  )}

                  {/* 2. Request Accordion (Endpoint / Params) */}
                  {apiData.request && (
                    <View style={[styles.subAccordionCard, { backgroundColor: isDark ? '#0E1422' : '#F1F5F9', borderColor: theme.border }]}>
                      <View style={styles.subAccordionHeader}>
                        <AppPressable
                          onPress={() => toggleExpand(`${item.id}:request`)}
                          style={styles.subAccordionToggle}>
                          <Ionicons
                            name={isRequestExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={13}
                            color="#30D158"
                          />
                          <ThemedText type="smallBold" style={{ color: '#30D158', fontSize: 12 }}>
                            📤 Request ({apiData.request.method || 'REQ'})
                          </ThemedText>
                        </AppPressable>
                        {isRequestExpanded && (
                          <AppPressable
                            onPress={async () => {
                              const reqInfo = {
                                method: apiData.request?.method,
                                path: apiData.request?.path,
                                fullUrl: apiData.request?.fullUrl,
                                queryParams: apiData.request?.queryParams,
                              };
                              await Clipboard.setStringAsync(JSON.stringify(reqInfo, null, 2));
                              showFeedbackToast('✓ Request copiado');
                            }}
                            hitSlop={8}
                            style={styles.subCopyBtn}>
                            <Ionicons name="copy-outline" size={11} color={theme.muted} />
                            <ThemedText type="small" style={{ color: theme.muted, fontSize: 10 }}>
                              Copiar
                            </ThemedText>
                          </AppPressable>
                        )}
                      </View>
                      {isRequestExpanded && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                          <View style={[styles.payloadBox, { backgroundColor: isDark ? '#0A0E18' : '#FFFFFF', borderColor: theme.border }]}>
                            <ThemedText type="small" style={[styles.payloadText, { color: '#10B981' }]} selectable>
                              {JSON.stringify(
                                {
                                  method: apiData.request.method,
                                  path: apiData.request.path,
                                  fullUrl: apiData.request.fullUrl,
                                  queryParams: apiData.request.queryParams,
                                },
                                null,
                                2
                              )}
                            </ThemedText>
                          </View>
                        </ScrollView>
                      )}
                    </View>
                  )}

                  {/* 3. Payload (Body) Accordion */}
                  {apiData.request?.body !== undefined && apiData.request?.body !== null && (
                    <View style={[styles.subAccordionCard, { backgroundColor: isDark ? '#0E1422' : '#F1F5F9', borderColor: theme.border }]}>
                      <View style={styles.subAccordionHeader}>
                        <AppPressable
                          onPress={() => toggleExpand(`${item.id}:payload`)}
                          style={styles.subAccordionToggle}>
                          <Ionicons
                            name={isPayloadExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={13}
                            color="#F59E0B"
                          />
                          <ThemedText type="smallBold" style={{ color: '#F59E0B', fontSize: 12 }}>
                            📦 Payload (Body)
                          </ThemedText>
                        </AppPressable>
                        {isPayloadExpanded && (
                          <AppPressable
                            onPress={async () => {
                              await Clipboard.setStringAsync(
                                typeof apiData.request?.body === 'string'
                                  ? apiData.request.body
                                  : JSON.stringify(apiData.request?.body, null, 2)
                              );
                              showFeedbackToast('✓ Payload copiado');
                            }}
                            hitSlop={8}
                            style={styles.subCopyBtn}>
                            <Ionicons name="copy-outline" size={11} color={theme.muted} />
                            <ThemedText type="small" style={{ color: theme.muted, fontSize: 10 }}>
                              Copiar
                            </ThemedText>
                          </AppPressable>
                        )}
                      </View>
                      {isPayloadExpanded && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                          <View style={[styles.payloadBox, { backgroundColor: isDark ? '#0A0E18' : '#FFFFFF', borderColor: '#F59E0B30' }]}>
                            <ThemedText type="small" style={[styles.payloadText, { color: '#D97706' }]} selectable>
                              {typeof apiData.request.body === 'string'
                                ? apiData.request.body
                                : JSON.stringify(apiData.request.body, null, 2)}
                            </ThemedText>
                          </View>
                        </ScrollView>
                      )}
                    </View>
                  )}

                  {/* 4. Response Accordion */}
                  {apiData.response && (
                    <View style={[styles.subAccordionCard, { backgroundColor: isDark ? '#0E1422' : '#F1F5F9', borderColor: theme.border }]}>
                      <View style={styles.subAccordionHeader}>
                        <AppPressable
                          onPress={() => toggleExpand(`${item.id}:response`)}
                          style={styles.subAccordionToggle}>
                          <Ionicons
                            name={isResponseExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={13}
                            color={item.level === 'error' ? '#FF453A' : '#BF5AF2'}
                          />
                          <ThemedText
                            type="smallBold"
                            style={{
                              color: item.level === 'error' ? '#FF453A' : '#BF5AF2',
                              fontSize: 12,
                            }}>
                            📥 Response ({apiData.response.status || 'RES'})
                          </ThemedText>
                          {apiData.response.duration && (
                            <View style={[styles.subBadge, { backgroundColor: item.level === 'error' ? '#FF453A20' : '#BF5AF220' }]}>
                              <ThemedText
                                type="smallBold"
                                style={{
                                  color: item.level === 'error' ? '#FF453A' : '#BF5AF2',
                                  fontSize: 10,
                                }}>
                                {apiData.response.duration}
                              </ThemedText>
                            </View>
                          )}
                        </AppPressable>
                        {isResponseExpanded && (
                          <AppPressable
                            onPress={async () => {
                              await Clipboard.setStringAsync(JSON.stringify(apiData.response, null, 2));
                              showFeedbackToast('✓ Response copiado');
                            }}
                            hitSlop={8}
                            style={styles.subCopyBtn}>
                            <Ionicons name="copy-outline" size={11} color={theme.muted} />
                            <ThemedText type="small" style={{ color: theme.muted, fontSize: 10 }}>
                              Copiar
                            </ThemedText>
                          </AppPressable>
                        )}
                      </View>
                      {isResponseExpanded && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                          <View
                            style={[
                              styles.payloadBox,
                              { backgroundColor: isDark ? '#0A0E18' : '#FFFFFF' },
                              item.level === 'error' ? { borderColor: '#FF453A40' } : { borderColor: theme.border },
                            ]}>
                            <ThemedText
                              type="small"
                              style={[styles.payloadText, item.level === 'error' ? { color: '#DC2626' } : { color: '#9333EA' }]}
                              selectable>
                              {JSON.stringify(apiData.response, null, 2)}
                            </ThemedText>
                          </View>
                        </ScrollView>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                /* Standard single accordion for non-API / generic error logs */
                <View>
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
                            : '🔍 Ver payload / detalles'}
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
                        <Ionicons name="copy-outline" size={12} color={theme.muted} />
                        <ThemedText type="small" style={{ color: theme.muted, fontSize: 11 }}>
                          Copiar JSON
                        </ThemedText>
                      </AppPressable>
                    )}
                  </View>

                  {isExpanded && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                      <View
                        style={[
                          styles.payloadBox,
                          { backgroundColor: isDark ? '#0A0E18' : '#FFFFFF' },
                          item.level === 'error' ? { borderColor: '#FF453A40' } : { borderColor: theme.border },
                        ]}>
                        <ThemedText
                          type="small"
                          style={[styles.payloadText, item.level === 'error' ? { color: '#DC2626' } : { color: theme.text }]}
                          selectable>
                          {item.details}
                        </ThemedText>
                      </View>
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
          )}
        </ThemedView>
      );
    },
    [expandedIds, theme, isDark]
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
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerTitleWrap}>
              <ThemedText type="subtitle">
                🛠️ Developer Logs
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
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
              <AppPressable
                onPress={handleCopyAll}
                style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]}
                accessibilityLabel="Copiar todos los logs">
                <Ionicons name="copy-outline" size={18} color={theme.primary} />
              </AppPressable>
              <AppPressable
                onPress={handleClear}
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

          {/* Search */}
          <View style={[styles.searchBar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Ionicons name="search" size={16} color={theme.muted} style={styles.searchIcon} />
            <TextInput
              placeholder="Buscar por mensaje, tag o error..."
              placeholderTextColor={theme.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: theme.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery ? (
              <AppPressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={theme.muted} />
              </AppPressable>
            ) : null}
          </View>

          {/* Filter Pills — Horizontal scroll for seamless mobile / tablet / desktop adaptation */}
          <View style={styles.filterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScrollContent}>
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
                      {
                        backgroundColor: isSelected
                          ? theme.primary
                          : theme.backgroundElement,
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

          {/* Logs list */}
          <FlatList
            data={filteredLogs}
            renderItem={renderLogItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="terminal-outline" size={44} color={theme.muted} />
                <ThemedText type="smallBold" themeColor="muted" style={{ marginTop: 12 }}>
                  No hay logs registrados para este filtro
                </ThemedText>
              </View>
            }
          />
        </View>
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
  toast: {
    backgroundColor: '#30D15820',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radii.sm,
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
  listContent: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  logCard: {
    borderRadius: Radii.md,
    padding: Spacing.three,
    borderWidth: 1,
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
    flexWrap: 'wrap',
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  tagText: {
    fontSize: 10,
  },
  messageText: {
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
  subAccordionCard: {
    borderRadius: Radii.sm,
    padding: Spacing.two,
    borderWidth: 1,
  },
  subAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subAccordionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
  },
  subBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radii.sm,
    marginLeft: 4,
  },
  subCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  horizontalScroll: {
    maxWidth: '100%',
  },
  payloadBox: {
    borderRadius: Radii.sm,
    padding: Spacing.three,
    marginTop: 4,
    borderWidth: 1,
    minWidth: '100%',
  },
  payloadText: {
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
});
