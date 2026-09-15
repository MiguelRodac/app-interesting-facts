import React, { useState, useMemo, useCallback } from 'react';
import {
  FlatList,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useLogStore, type LogEntry, type LogLevel } from '@/data/stores/logStore';
import { useUIStore } from '@/data/stores/uiStore';
import { Toast } from '@/components/Toast';
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

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    const success = await Clipboard.setStringAsync(text);
    if (success) return true;
  } catch {
    // continue to web fallbacks
  }

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fallback to execCommand below
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.select();
      const res = document.execCommand('copy');
      document.body.removeChild(textarea);
      return res;
    } catch {
      return false;
    }
  }

  return false;
}

function formatLogsForExport(entries: LogEntry[], filterLevel: string, query: string): string {
  const timestamp = new Date().toISOString();
  const headerLines = [
    '================================================================================',
    'INTERESTING FACTS - DEVELOPER LOGS EXPORT',
    `Timestamp: ${timestamp}`,
    `Filter Level: ${filterLevel.toUpperCase()}`,
    query ? `Search Query: "${query}"` : null,
    `Total Entries: ${entries.length}`,
    '================================================================================',
    '',
  ];

  const header = headerLines.filter(Boolean).join('\n');

  const body = entries
    .map((l) => {
      const dateStr = new Date(l.timestamp).toISOString();
      const timeStr = formatTime(l.timestamp);
      const tagStr = l.tag ? `[${l.tag}] ` : '';
      const detailsStr = l.details ? `\nDetails: ${l.details}` : '';
      return `[${dateStr} | ${timeStr}] [${l.level.toUpperCase()}] ${tagStr}${l.message}${detailsStr}`;
    })
    .join('\n---\n');

  return `${header}\n${body}\n`;
}

function normalizeSearchText(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const SEARCH_STOP_WORDS = new Set([
  'de', 'en', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'al', 'del', 'a', 'y', 'o', 'por', 'para', 'con', 'sin', 'que',
  'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'with', 'a', 'an'
]);

function getSearchTokens(query: string): string[] {
  const rawTokens = normalizeSearchText(query)
    .split(/[\s,;|/]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (rawTokens.length <= 1) return rawTokens;
  const filtered = rawTokens.filter((t) => !SEARCH_STOP_WORDS.has(t));
  return filtered.length > 0 ? filtered : rawTokens;
}

function buildLogSearchText(l: LogEntry): string {
  const levelSynonyms =
    l.level === 'error'
      ? 'error errores err fallo fallos crash exception excepciones'
      : l.level === 'warn'
      ? 'warn warning advertencia advertencias avisos'
      : l.level === 'api'
      ? 'api endpoint peticion peticiones request response call fetch status'
      : 'info informational informacion';

  const dateStr = new Date(l.timestamp).toISOString();
  const timeStr = formatTime(l.timestamp);
  const tagStr = l.tag || '';
  const msgStr = l.message || '';
  const detailsStr = typeof l.details === 'string' ? l.details : JSON.stringify(l.details || '');

  return normalizeSearchText(`${msgStr} ${tagStr} ${l.level} ${levelSynonyms} ${timeStr} ${dateStr} ${detailsStr}`);
}

function matchLog(l: LogEntry, tokens: string[], rawQueryNormalized: string): boolean {
  if (tokens.length === 0) return true;
  const target = buildLogSearchText(l);
  if (target.includes(rawQueryNormalized)) return true;
  return tokens.every((t) => target.includes(t));
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
  const showToast = useUIStore((s) => s.showToast);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [confirmExportVisible, setConfirmExportVisible] = useState(false);

  const counts = useMemo(() => {
    const res = { all: 0, error: 0, warn: 0, api: 0, info: 0, debug: 0 };
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
        // Count API logs including API errors (status 400+, 500)
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
        showToast('Logs vaciados', 'info');
      },
    });
  };

  const handleCopyAll = async () => {
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
  };

  const executeExportLogs = async () => {
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

    // Native platforms (Android / iOS)
    try {
      await Share.share({
        title: filename,
        message: exportText,
      });
      showToast(`Compartiendo ${filteredLogs.length} logs`, 'info');
    } catch {
      // Fallback: copy to clipboard
      const ok = await copyToClipboard(exportText);
      if (ok) {
        showToast('Logs copiados al portapapeles', 'success');
      } else {
        showToast('Error al exportar los logs', 'warning');
      }
    }
  };

  const handleExportLogs = () => {
    if (filteredLogs.length === 0) {
      showToast('No hay logs para exportar', 'warning');
      return;
    }
    setConfirmExportVisible(true);
  };

  const handleCopySingle = async (entry: LogEntry) => {
    const text = `[${formatTime(entry.timestamp)}] [${entry.level.toUpperCase()}] ${entry.tag ? `[${entry.tag}] ` : ''}${entry.message}${
      entry.details ? `\nDetails: ${entry.details}` : ''
    }`;
    const ok = await copyToClipboard(text);
    if (ok) {
      showToast('Log copiado', 'success');
    } else {
      showToast('Error al copiar', 'warning');
    }
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
                              await copyToClipboard(JSON.stringify(apiData.headers, null, 2));
                              showToast('Headers copiados', 'success');
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
                              await copyToClipboard(JSON.stringify(reqInfo, null, 2));
                              showToast('Request copiado', 'success');
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
                              await copyToClipboard(
                                typeof apiData.request?.body === 'string'
                                  ? apiData.request.body
                                  : JSON.stringify(apiData.request?.body, null, 2)
                              );
                              showToast('Payload copiado', 'success');
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
                              await copyToClipboard(JSON.stringify(apiData.response, null, 2));
                              showToast('Response copiado', 'success');
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
                            await copyToClipboard(item.details);
                            showToast('Detalles copiados', 'success');
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
                {filteredLogs.length === logs.length
                  ? `${logs.length} eventos en memoria`
                  : `${filteredLogs.length} de ${logs.length} eventos`}
              </ThemedText>
            </View>

            <View style={styles.headerActions}>
              <AppPressable
                onPress={handleCopyAll}
                style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]}
                accessibilityLabel="Copiar logs filtrados">
                <Ionicons name="copy-outline" size={18} color={theme.primary} />
              </AppPressable>
              <AppPressable
                onPress={handleExportLogs}
                style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]}
                accessibilityLabel="Exportar logs a archivo .txt">
                <Ionicons name="download-outline" size={18} color={theme.primary} />
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
              placeholder="Buscar por mensaje, tag, endpoint, error..."
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
                <Ionicons
                  name={searchQuery.trim() ? 'search-outline' : 'terminal-outline'}
                  size={44}
                  color={theme.muted}
                />
                <ThemedText type="smallBold" themeColor="muted" style={{ marginTop: 12, textAlign: 'center' }}>
                  {searchQuery.trim()
                    ? `No se encontraron logs para "${searchQuery.trim()}" en ${
                        selectedLevel === 'all' ? 'todos los eventos' : selectedLevel.toUpperCase()
                      }`
                    : 'No hay logs registrados para este filtro'}
                </ThemedText>
                {searchQuery.trim() && selectedLevel !== 'all' && counts.all > 0 ? (
                  <AppPressable
                    onPress={() => setSelectedLevel('all')}
                    style={[styles.emptyActionButton, { backgroundColor: theme.primary, marginTop: Spacing.three }]}>
                    <Ionicons name="layers-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
                      Buscar en Todos ({counts.all})
                    </ThemedText>
                  </AppPressable>
                ) : null}
                {searchQuery.trim() ? (
                  <AppPressable
                    onPress={() => setSearchQuery('')}
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
            }
          />
        </View>

        {/* Export Confirmation Dialog */}
        {confirmExportVisible && (
          <View style={styles.confirmOverlay}>
            <ThemedView
              type="backgroundElement"
              style={[styles.confirmCard, { borderColor: theme.border }]}>
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
                    {filteredLogs.length} evento{filteredLogs.length > 1 ? 's' : ''}
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
                  onPress={() => setConfirmExportVisible(false)}
                  style={[styles.confirmBtn, styles.cancelBtn, { borderColor: theme.border }]}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Cancelar
                  </ThemedText>
                </AppPressable>
                <AppPressable
                  onPress={async () => {
                    setConfirmExportVisible(false);
                    await executeExportLogs();
                  }}
                  style={[styles.confirmBtn, { backgroundColor: theme.primary }]}>
                  <Ionicons name="download-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
                    Confirmar y descargar
                  </ThemedText>
                </AppPressable>
              </View>
            </ThemedView>
          </View>
        )}
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
    paddingVertical: 48,
    paddingHorizontal: Spacing.four,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radii.full,
  },
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
