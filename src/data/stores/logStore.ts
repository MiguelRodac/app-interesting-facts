import { create } from 'zustand';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'api';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  tag?: string;
  message: string;
  details?: string;
}

interface LogStoreState {
  logs: LogEntry[];
  devModeUnlocked: boolean;
  addLog: (level: LogLevel, message: string, details?: unknown, tag?: string) => void;
  clearLogs: () => void;
  unlockDevMode: () => void;
}

const MAX_LOGS = 400;

function formatDetails(details: unknown): string | undefined {
  if (details === undefined || details === null) return undefined;
  if (typeof details === 'string') return details;
  if (details instanceof Error) {
    return `${details.name}: ${details.message}\n${details.stack ?? ''}`;
  }
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

export const useLogStore = create<LogStoreState>((set) => ({
  logs: [],
  devModeUnlocked: false,

  addLog: (level, message, rawDetails, tag) => {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      level,
      tag,
      message: typeof message === 'string' ? message : String(message),
      details: formatDetails(rawDetails),
    };

    set((state) => {
      const nextLogs = [entry, ...state.logs];
      if (nextLogs.length > MAX_LOGS) {
        nextLogs.length = MAX_LOGS;
      }
      return { logs: nextLogs };
    });
  },

  clearLogs: () => set({ logs: [] }),

  unlockDevMode: () => set({ devModeUnlocked: true }),
}));
