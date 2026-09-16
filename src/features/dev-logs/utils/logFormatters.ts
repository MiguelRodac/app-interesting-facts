import { Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { LogEntry, LogLevel } from '../stores/logStore';

export const LEVEL_COLORS: Record<LogLevel, { bg: string; text: string; label: string }> = {
  error: { bg: '#FF3B3020', text: '#FF453A', label: 'ERR' },
  warn: { bg: '#FF950020', text: '#FF9F0A', label: 'WARN' },
  api: { bg: '#AF52DE20', text: '#BF5AF2', label: 'API' },
  info: { bg: '#0A84FF20', text: '#0A84FF', label: 'INFO' },
  debug: { bg: '#8E8E9320', text: '#98989D', label: 'DBG' },
};

export function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
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

export function formatLogsForExport(entries: LogEntry[], filterLevel: string, query: string): string {
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

export interface ParsedApiDetails {
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

export function tryParseApiLog(details?: string): ParsedApiDetails | null {
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
