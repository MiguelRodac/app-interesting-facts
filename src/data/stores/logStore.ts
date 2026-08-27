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

function serializeValue(val: unknown, depth = 0): unknown {
  if (depth > 6) return '[Max Depth]';
  if (val === undefined || val === null) return val;
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return val;
  }
  if (typeof val === 'function') {
    return `[Function: ${val.name || 'anonymous'}]`;
  }
  if (val instanceof Error) {
    const errorObj: Record<string, unknown> = {
      name: val.name,
      message: val.message,
      stack: val.stack,
    };
    for (const key of Object.keys(val)) {
      errorObj[key] = serializeValue((val as unknown as Record<string, unknown>)[key], depth + 1);
    }
    return errorObj;
  }
  if (Array.isArray(val)) {
    return val.map((item) => serializeValue(item, depth + 1));
  }
  if (typeof val === 'object') {
    const res: Record<string, unknown> = {};
    const obj = val as Record<string, unknown>;
    
    // Copy all properties
    for (const [k, v] of Object.entries(obj)) {
      res[k] = serializeValue(v, depth + 1);
    }
    // Include common non-enumerable error props if present
    if ('message' in obj && typeof obj.message === 'string' && res.message === undefined) {
      res.message = obj.message;
    }
    if ('name' in obj && typeof obj.name === 'string' && res.name === undefined) {
      res.name = obj.name;
    }
    if ('stack' in obj && typeof obj.stack === 'string' && res.stack === undefined) {
      res.stack = obj.stack;
    }
    if ('code' in obj && res.code === undefined) {
      res.code = obj.code;
    }
    return res;
  }
  return String(val);
}

function formatDetails(details: unknown): string | undefined {
  if (details === undefined || details === null) return undefined;
  if (typeof details === 'string') return details;
  try {
    const serialized = serializeValue(details);
    if (typeof serialized === 'string') return serialized;
    return JSON.stringify(serialized, null, 2);
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
