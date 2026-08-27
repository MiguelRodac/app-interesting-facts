import { useLogStore, type LogLevel } from '@/data/stores/logStore';

let isHooked = false;

export const logger = {
  info: (message: string, details?: unknown, tag?: string) => {
    console.info(`[${tag ?? 'INFO'}]`, message, details ?? '');
  },

  warn: (message: string, details?: unknown, tag?: string) => {
    console.warn(`[${tag ?? 'WARN'}]`, message, details ?? '');
  },

  error: (message: string, details?: unknown, tag?: string) => {
    console.error(`[${tag ?? 'ERROR'}]`, message, details ?? '');
  },

  debug: (message: string, details?: unknown, tag?: string) => {
    console.debug(`[${tag ?? 'DEBUG'}]`, message, details ?? '');
  },

  api: (method: string, endpoint: string, status: number, durationMs?: number, payload?: unknown) => {
    const level: LogLevel = status >= 400 ? 'error' : 'api';
    const tag = `API ${method.toUpperCase()}`;
    const message = `${status} ${endpoint} (${durationMs ?? 0}ms)`;
    useLogStore.getState().addLog(level, message, payload, tag);
  },

  initGlobalLogCapture: () => {
    if (isHooked) return;
    isHooked = true;

    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args: unknown[]) => {
      originalLog.apply(console, args);
      try {
        const msg = typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0]);
        const details = args.length > 1 ? args.slice(1) : undefined;
        useLogStore.getState().addLog('info', msg, details);
      } catch {}
    };

    console.info = (...args: unknown[]) => {
      originalInfo.apply(console, args);
      try {
        const msg = typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0]);
        const details = args.length > 1 ? args.slice(1) : undefined;
        useLogStore.getState().addLog('info', msg, details);
      } catch {}
    };

    console.warn = (...args: unknown[]) => {
      originalWarn.apply(console, args);
      try {
        const msg = typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0]);
        const details = args.length > 1 ? args.slice(1) : undefined;
        useLogStore.getState().addLog('warn', msg, details);
      } catch {}
    };

    console.error = (...args: unknown[]) => {
      originalError.apply(console, args);
      try {
        const msg = typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0]);
        const details = args.length > 1 ? args.slice(1) : undefined;
        useLogStore.getState().addLog('error', msg, details);
      } catch {}
    };
  },
};
