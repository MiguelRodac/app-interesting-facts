import { safeSlice, safeTruncate, cleanSurrogates, safeInsertText } from '@/utils/text';

describe('text utils', () => {
  describe('safeSlice & safeTruncate', () => {
    it('returns empty string for empty input or non-positive maxChars', () => {
      expect(safeSlice('', 10)).toBe('');
      expect(safeSlice('hello', 0)).toBe('');
      expect(safeSlice('hello', -5)).toBe('');
    });

    it('slices standard ascii text', () => {
      expect(safeSlice('hello world', 5)).toBe('hello');
      expect(safeTruncate('hello', 3)).toBe('hel');
    });

    it('safely handles multi-byte unicode emojis without splitting surrogate pairs', () => {
      const emojiString = '🚀🎉🔥👍';
      // 4 emojis: 4 code points, but 8 UTF-16 code units
      expect(safeSlice(emojiString, 2)).toBe('🚀🎉');
      expect(safeSlice(emojiString, 3)).toBe('🚀🎉🔥');
    });
  });

  describe('cleanSurrogates', () => {
    it('returns empty string for empty input', () => {
      expect(cleanSurrogates('')).toBe('');
    });

    it('leaves well-formed text untouched', () => {
      expect(cleanSurrogates('Hello world!')).toBe('Hello world!');
      expect(cleanSurrogates('Emoji test 🚀🎉')).toBe('Emoji test 🚀🎉');
    });

    it('handles lone unpaired surrogates ensuring well-formed text', () => {
      const loneHigh = 'test\uD800world';
      const loneLow = 'test\uDC00world';
      const cleanedHigh = cleanSurrogates(loneHigh);
      const cleanedLow = cleanSurrogates(loneLow);

      // Result must not contain any lone surrogates
      const loneSurrogateRegex = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
      expect(loneSurrogateRegex.test(cleanedHigh)).toBe(false);
      expect(loneSurrogateRegex.test(cleanedLow)).toBe(false);
    });
  });

  describe('safeInsertText', () => {
    it('inserts text at given index', () => {
      const res = safeInsertText('hello', ' there', 5);
      expect(res.text).toBe('hello there');
      expect(res.newCursor).toBe(11);
    });

    it('handles bounds correctly (negative and beyond length)', () => {
      const resStart = safeInsertText('world', 'hello ', -1);
      expect(resStart.text).toBe('hello world');
      expect(resStart.newCursor).toBe(6);

      const resEnd = safeInsertText('hello', ' world', 100);
      expect(resEnd.text).toBe('hello world');
      expect(resEnd.newCursor).toBe(11);
    });
  });
});
