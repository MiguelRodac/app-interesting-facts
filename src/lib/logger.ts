import { useLogStore, type LogLevel } from '@/data/stores/logStore';

export interface ApiLogParams {
  method: string;
  path: string;
  url: string;
  params?: Record<string, string>;
  status: number;
  durationMs: number;
  requestBody?: unknown;
  responseBody?: unknown;
  hasAuthToken: boolean;
  error?: unknown;
}

let isHooked = false;

export const logger = {
  info: (message: string, details?: unknown, tag?: string) => {
    console.info(`[${tag ?? 'INFO'}]`, message, details ?? '');
    useLogStore.getState().addLog('info', message, details, tag ?? 'INFO');
  },

  warn: (message: string, details?: unknown, tag?: string) => {
    console.warn(`[${tag ?? 'WARN'}]`, message, details ?? '');
    useLogStore.getState().addLog('warn', message, details, tag ?? 'WARN');
  },

  error: (message: string, details?: unknown, tag?: string) => {
    console.error(`[${tag ?? 'ERROR'}]`, message, details ?? '');
    useLogStore.getState().addLog('error', message, details, tag ?? 'ERROR');
  },

  debug: (message: string, details?: unknown, tag?: string) => {
    console.debug(`[${tag ?? 'DEBUG'}]`, message, details ?? '');
    useLogStore.getState().addLog('debug', message, details, tag ?? 'DEBUG');
  },

  api: (info: ApiLogParams) => {
    const isError = info.status >= 400 || info.status === 0;
    const level: LogLevel = isError ? 'error' : 'api';
    const tag = `API ${info.method.toUpperCase()}`;
    const statusEmoji = info.status === 0 ? '⚡ ERR' : isError ? `❌ ${info.status}` : `✓ ${info.status}`;
    const message = `${statusEmoji} ${info.method.toUpperCase()} ${info.path} (${info.durationMs}ms)`;

    const structuredPayload: Record<string, unknown> = {
      '➡️ Request': {
        method: info.method.toUpperCase(),
        path: info.path,
        fullUrl: info.url,
        hasAuthToken: info.hasAuthToken,
        queryParams: info.params && Object.keys(info.params).length > 0 ? info.params : undefined,
        body: info.requestBody !== undefined ? info.requestBody : undefined,
      },
      '⬅️ Response': {
        status: info.status === 0 ? 'Network/Fetch Error' : info.status,
        duration: `${info.durationMs}ms`,
        body: info.responseBody !== undefined ? info.responseBody : undefined,
        error: info.error !== undefined ? info.error : undefined,
      },
    };

    useLogStore.getState().addLog(level, message, structuredPayload, tag);
  },

  initGlobalLogCapture: () => {
    if (isHooked) return;
    isHooked = true;

    // 1. Hook console methods
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

    // 2. Hook global unhandled JS errors in React Native
    const globalErrorUtils = (globalThis as unknown as { ErrorUtils?: { getGlobalHandler: () => (error: Error, isFatal?: boolean) => void; setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void } }).ErrorUtils;
    if (globalErrorUtils && typeof globalErrorUtils.getGlobalHandler === 'function') {
      const defaultHandler = globalErrorUtils.getGlobalHandler();
      globalErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        try {
          useLogStore.getState().addLog(
            'error',
            `[UNHANDLED ${isFatal ? 'FATAL' : 'EXCEPTION'}] ${error.message || String(error)}`,
            {
              name: error.name,
              message: error.message,
              stack: error.stack,
              isFatal,
            },
            'CRASH'
          );
        } catch {}
        if (defaultHandler) {
          defaultHandler(error, isFatal);
        }
      });
    }
  },
};
