/**
 * Content parsing utility for hashtags, mentions, and URLs.
 * Splits text into segments of plain text, hashtags, mentions, and links.
 */

export interface ParsedSegment {
  type: 'text' | 'hashtag' | 'mention' | 'url';
  content: string;
  url?: string;
}

// Matches URLs (http://, https://, www.), #hashtag, or @mention.
// Usernames may contain dots (e.g. "marta.ken"), so dots followed by more
// word chars are part of the tag. A trailing dot (end of sentence) is not.
const TOKEN_REGEX = /(https?:\/\/[^\s<>()]+|www\.[^\s<>()]+|[#@][\w]+(?:\.\w+)*)/gi;

const TRAILING_PUNCTUATION_REGEX = /[.,!?:;)\]}>]+$/;

/**
 * Parses content text into segments of text, hashtags, mentions, and URLs.
 *
 * @example
 * parseContent("#hello world @user visit https://example.com")
 * // → [
 * //   { type: 'hashtag', content: '#hello' },
 * //   { type: 'text', content: ' world ' },
 * //   { type: 'mention', content: '@user' },
 * //   { type: 'text', content: ' visit ' },
 * //   { type: 'url', content: 'https://example.com', url: 'https://example.com' }
 * // ]
 */
export function parseContent(text: string): ParsedSegment[] {
  if (!text) return [];

  const segments: ParsedSegment[] = [];
  let lastIndex = 0;

  // Reset regex state for each call
  TOKEN_REGEX.lastIndex = 0;

  let match = TOKEN_REGEX.exec(text);

  while (match !== null) {
    const rawMatch = match[0];
    const matchStart = match.index;
    let matchContent = rawMatch;
    let trailingPunctuation = '';

    // If it's a URL, trim trailing punctuation that shouldn't be part of the URL (e.g. "https://example.com.")
    const isUrl = /^https?:\/\//i.test(rawMatch) || /^www\./i.test(rawMatch);
    if (isUrl) {
      const punctMatch = rawMatch.match(TRAILING_PUNCTUATION_REGEX);
      if (punctMatch) {
        trailingPunctuation = punctMatch[0];
        matchContent = rawMatch.slice(0, -trailingPunctuation.length);
      }
    }

    // Push preceding plain text if any
    if (matchStart > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, matchStart),
      });
    }

    if (isUrl) {
      const normalizedUrl = /^https?:\/\//i.test(matchContent)
        ? matchContent
        : `https://${matchContent}`;

      segments.push({
        type: 'url',
        content: matchContent,
        url: normalizedUrl,
      });
    } else {
      const tagChar = matchContent[0];
      const type = tagChar === '#' ? 'hashtag' : 'mention';
      segments.push({
        type,
        content: matchContent,
      });
    }

    // If we stripped trailing punctuation from a URL, push it as plain text immediately
    if (trailingPunctuation) {
      segments.push({
        type: 'text',
        content: trailingPunctuation,
      });
    }

    lastIndex = matchStart + rawMatch.length;
    match = TOKEN_REGEX.exec(text);
  }

  // Push remaining plain text if any
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return segments;
}
