/**
 * Content parsing utility for hashtags and mentions.
 * Splits text into segments of plain text, hashtags, and mentions.
 */

export interface ParsedSegment {
  type: 'text' | 'hashtag' | 'mention';
  content: string;
}

// Matches #hashtag or @mention.
// Usernames may contain dots (e.g. "marta.ken"), so dots followed by more
// word chars are part of the tag. A trailing dot (end of sentence) is not.
const TAG_REGEX = /([#@][\w]+(?:\.\w+)*)/g;

/**
 * Parses content text into segments of text, hashtags, and mentions.
 *
 * @example
 * parseContent("#hello world @user")
 * // → [
 * //   { type: 'hashtag', content: '#hello' },
 * //   { type: 'text', content: ' world ' },
 * //   { type: 'mention', content: '@user' }
 * // ]
 */
export function parseContent(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  let lastIndex = 0;

  // Reset regex state for each call
  TAG_REGEX.lastIndex = 0;

  let match = TAG_REGEX.exec(text);

  while (match !== null) {
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    // Push preceding plain text if any
    if (matchStart > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, matchStart),
      });
    }

    // Determine if it's a hashtag or mention
    const tagChar = match[0][0];
    const type = tagChar === '#' ? 'hashtag' : 'mention';

    segments.push({
      type,
      content: match[0],
    });

    lastIndex = matchEnd;
    match = TAG_REGEX.exec(text);
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
