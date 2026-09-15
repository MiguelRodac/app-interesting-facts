/**
 * Unicode-aware text utilities to prevent splitting UTF-16 surrogate pairs
 * (such as 4-byte emojis) which cause lone/unpaired surrogate code units (\ud800-\udfff).
 */

/**
 * Slices or truncates text by Unicode code points rather than raw UTF-16 code units.
 * Guarantees that multi-byte emojis and surrogate pairs are not sliced in half.
 */
export function safeSlice(text: string, maxChars: number): string {
  if (!text) return '';
  if (maxChars <= 0) return '';
  return Array.from(text).slice(0, maxChars).join('');
}

export const safeTruncate = safeSlice;

/**
 * Sanitizes a string to ensure there are no orphaned or unpaired surrogate code units.
 * Uses native String.prototype.toWellFormed if supported, with a regex fallback.
 */
export function cleanSurrogates(text: string): string {
  if (!text) return '';
  if (typeof (text as unknown as { toWellFormed?: () => string }).toWellFormed === 'function') {
    return (text as unknown as { toWellFormed: () => string }).toWellFormed();
  }
  // Remove lone high surrogates (not followed by low) and lone low surrogates (not preceded by high)
  return text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
}

/**
 * Inserts text at a given character index without splitting UTF-16 surrogate pairs.
 */
export function safeInsertText(
  content: string,
  insertText: string,
  cursorIndex: number,
): { text: string; newCursor: number } {
  let index = Math.max(0, Math.min(cursorIndex, content.length));

  if (index > 0 && index < content.length) {
    const prevChar = content.charCodeAt(index - 1);
    const currChar = content.charCodeAt(index);
    // If the index falls right between a high surrogate and a low surrogate, advance by 1
    if (prevChar >= 0xd800 && prevChar <= 0xdbff && currChar >= 0xdc00 && currChar <= 0xdfff) {
      index = index + 1;
    }
  }

  const before = content.slice(0, index);
  const after = content.slice(index);
  return {
    text: `${before}${insertText}${after}`,
    newCursor: index + insertText.length,
  };
}
