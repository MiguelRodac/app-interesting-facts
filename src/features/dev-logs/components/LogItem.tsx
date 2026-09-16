import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LogEntry } from '../stores/logStore';
import { LEVEL_COLORS, formatTime, tryParseApiLog } from '../utils/logFormatters';
import { LogApiAccordions } from './LogApiAccordions';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

interface LogItemProps {
  item: LogEntry;
  expandedIds: Record<string, boolean>;
  onToggleExpand: (key: string) => void;
  onCopySingle: (entry: LogEntry) => void;
  onCopyText: (text: string, message: string) => void;
  isDark: boolean;
}

export const LogItem = React.memo(function LogItem({
  item,
  expandedIds,
  onToggleExpand,
  onCopySingle,
  onCopyText,
  isDark,
}: LogItemProps) {
  const theme = useTheme();
  const isExpanded = !!expandedIds[item.id];
  const levelStyle = LEVEL_COLORS[item.level] || LEVEL_COLORS.info;
  const apiData = tryParseApiLog(item.details);

  return (
    <ThemedView type="backgroundElement" style={[styles.logCard, { borderColor: theme.border }]}>
      <AppPressable onPress={() => onCopySingle(item)} style={styles.logHeader}>
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
            <LogApiAccordions
              item={item}
              apiData={apiData}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onCopyText={onCopyText}
              isDark={isDark}
            />
          ) : (
            /* Standard single accordion for non-API / generic error logs */
            <View>
              <View style={styles.standardHeaderRow}>
                <AppPressable onPress={() => onToggleExpand(item.id)} style={styles.detailsToggle}>
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
                    onPress={() => item.details && onCopyText(item.details, 'Detalles copiados')}
                    hitSlop={8}
                    style={styles.copyJsonBtn}>
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
});

const styles = StyleSheet.create({
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
  standardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  copyJsonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
});
