import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LogEntry } from '../stores/logStore';
import type { ParsedApiDetails } from '../utils/logFormatters';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

interface ApiSectionAccordionProps {
  title: string;
  color: string;
  badge?: string | number;
  isExpanded: boolean;
  onToggle: () => void;
  content: string;
  textColor?: string;
  borderColor?: string;
  onCopy: () => void;
  isDark: boolean;
  themeBorder: string;
}

const ApiSectionAccordion = React.memo(function ApiSectionAccordion({
  title,
  color,
  badge,
  isExpanded,
  onToggle,
  content,
  textColor,
  borderColor,
  onCopy,
  isDark,
  themeBorder,
}: ApiSectionAccordionProps) {
  return (
    <View style={[styles.subAccordionCard, { backgroundColor: isDark ? '#0E1422' : '#F1F5F9', borderColor: themeBorder }]}>
      <View style={styles.subAccordionHeader}>
        <AppPressable onPress={onToggle} style={styles.subAccordionToggle}>
          <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-forward'} size={13} color={color} />
          <ThemedText type="smallBold" style={{ color, fontSize: 12 }}>
            {title}
          </ThemedText>
          {badge !== undefined ? (
            <View style={[styles.subBadge, { backgroundColor: `${color}20` }]}>
              <ThemedText type="smallBold" style={{ color, fontSize: 10 }}>
                {badge}
              </ThemedText>
            </View>
          ) : null}
        </AppPressable>
        {isExpanded && (
          <AppPressable onPress={onCopy} hitSlop={8} style={styles.subCopyBtn}>
            <Ionicons name="copy-outline" size={11} color={color} />
            <ThemedText type="small" style={{ color, fontSize: 10 }}>
              Copiar
            </ThemedText>
          </AppPressable>
        )}
      </View>
      {isExpanded && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          <View
            style={[
              styles.payloadBox,
              { backgroundColor: isDark ? '#0A0E18' : '#FFFFFF', borderColor: borderColor || themeBorder },
            ]}>
            <ThemedText type="small" style={[styles.payloadText, textColor ? { color: textColor } : null]} selectable>
              {content}
            </ThemedText>
          </View>
        </ScrollView>
      )}
    </View>
  );
});

interface LogApiAccordionsProps {
  item: LogEntry;
  apiData: ParsedApiDetails;
  expandedIds: Record<string, boolean>;
  onToggleExpand: (key: string) => void;
  onCopyText: (text: string, message: string) => void;
  isDark: boolean;
}

export const LogApiAccordions = React.memo(function LogApiAccordions({
  item,
  apiData,
  expandedIds,
  onToggleExpand,
  onCopyText,
  isDark,
}: LogApiAccordionsProps) {
  const theme = useTheme();

  const isHeadersExpanded = !!expandedIds[`${item.id}:headers`];
  const isRequestExpanded = !!expandedIds[`${item.id}:request`];
  const isPayloadExpanded = !!expandedIds[`${item.id}:payload`];
  const isResponseExpanded = !!expandedIds[`${item.id}:response`];

  const headersJson = apiData.headers ? JSON.stringify(apiData.headers, null, 2) : '';
  const requestJson = apiData.request
    ? JSON.stringify(
        {
          method: apiData.request.method,
          path: apiData.request.path,
          fullUrl: apiData.request.fullUrl,
          queryParams: apiData.request.queryParams,
        },
        null,
        2
      )
    : '';
  const payloadJson =
    apiData.request?.body !== undefined && apiData.request?.body !== null
      ? typeof apiData.request.body === 'string'
        ? apiData.request.body
        : JSON.stringify(apiData.request.body, null, 2)
      : '';
  const responseJson = apiData.response ? JSON.stringify(apiData.response, null, 2) : '';

  return (
    <View style={styles.apiAccordionsWrap}>
      {apiData.headers && (
        <ApiSectionAccordion
          title="📋 Headers"
          color="#38BDF8"
          badge={Object.keys(apiData.headers).length}
          isExpanded={isHeadersExpanded}
          onToggle={() => onToggleExpand(`${item.id}:headers`)}
          content={headersJson}
          onCopy={() => onCopyText(headersJson, 'Headers copiados')}
          isDark={isDark}
          themeBorder={theme.border}
        />
      )}

      {apiData.request && (
        <ApiSectionAccordion
          title={`📤 Request (${apiData.request.method || 'REQ'})`}
          color="#30D158"
          isExpanded={isRequestExpanded}
          onToggle={() => onToggleExpand(`${item.id}:request`)}
          content={requestJson}
          textColor="#10B981"
          onCopy={() => onCopyText(requestJson, 'Request copiado')}
          isDark={isDark}
          themeBorder={theme.border}
        />
      )}

      {payloadJson ? (
        <ApiSectionAccordion
          title="📦 Payload (Body)"
          color="#F59E0B"
          isExpanded={isPayloadExpanded}
          onToggle={() => onToggleExpand(`${item.id}:payload`)}
          content={payloadJson}
          textColor="#D97706"
          borderColor="#F59E0B30"
          onCopy={() => onCopyText(payloadJson, 'Payload copiado')}
          isDark={isDark}
          themeBorder={theme.border}
        />
      ) : null}

      {apiData.response && (
        <ApiSectionAccordion
          title={`📥 Response (${apiData.response.status || 'RES'})`}
          color={item.level === 'error' ? '#FF453A' : '#BF5AF2'}
          badge={apiData.response.duration}
          isExpanded={isResponseExpanded}
          onToggle={() => onToggleExpand(`${item.id}:response`)}
          content={responseJson}
          textColor={item.level === 'error' ? '#DC2626' : '#9333EA'}
          borderColor={item.level === 'error' ? '#FF453A40' : undefined}
          onCopy={() => onCopyText(responseJson, 'Response copiado')}
          isDark={isDark}
          themeBorder={theme.border}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  apiAccordionsWrap: {
    gap: 6,
    marginTop: 4,
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
});
