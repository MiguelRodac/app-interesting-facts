import type { LogEntry } from '../stores/logStore';

export function normalizeSearchText(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export const SEARCH_STOP_WORDS = new Set([
  'de', 'en', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'al', 'del', 'a', 'y', 'o', 'por', 'para', 'con', 'sin', 'que',
  'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'with', 'a', 'an'
]);

export function getSearchTokens(query: string): string[] {
  const rawTokens = normalizeSearchText(query)
    .split(/[\s,;|/]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (rawTokens.length <= 1) return rawTokens;
  const filtered = rawTokens.filter((t) => !SEARCH_STOP_WORDS.has(t));
  return filtered.length > 0 ? filtered : rawTokens;
}

export function buildLogSearchText(l: LogEntry): string {
  const levelSynonyms =
    l.level === 'error'
      ? 'error errores err fallo fallos crash exception excepciones'
      : l.level === 'warn'
      ? 'warn warning advertencia advertencias avisos'
      : l.level === 'api'
      ? 'api endpoint peticion peticiones request response call fetch status'
      : 'info informational informacion';

  const dateStr = new Date(l.timestamp).toISOString();
  const timeStr = new Date(l.timestamp).toTimeString();
  const tagStr = l.tag || '';
  const msgStr = l.message || '';
  const detailsStr = typeof l.details === 'string' ? l.details : JSON.stringify(l.details || '');

  return normalizeSearchText(`${msgStr} ${tagStr} ${l.level} ${levelSynonyms} ${timeStr} ${dateStr} ${detailsStr}`);
}

export function matchLog(l: LogEntry, tokens: string[], rawQueryNormalized: string): boolean {
  if (tokens.length === 0) return true;
  const target = buildLogSearchText(l);
  if (target.includes(rawQueryNormalized)) return true;
  return tokens.every((t) => target.includes(t));
}
