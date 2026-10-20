import { parseContent } from '@/utils/parseContent';

describe('parseContent utility', () => {
  it('returns an empty array for empty or falsy inputs', () => {
    expect(parseContent('')).toEqual([]);
    expect(parseContent(null as unknown as string)).toEqual([]);
    expect(parseContent(undefined as unknown as string)).toEqual([]);
  });

  it('returns single text segment when there are no special tokens', () => {
    const result = parseContent('This is a completely plain text with no tokens.');
    expect(result).toEqual([
      { type: 'text', content: 'This is a completely plain text with no tokens.' },
    ]);
  });

  describe('hashtags', () => {
    it('parses isolated hashtags', () => {
      const result = parseContent('Check this #science fact');
      expect(result).toEqual([
        { type: 'text', content: 'Check this ' },
        { type: 'hashtag', content: '#science' },
        { type: 'text', content: ' fact' },
      ]);
    });

    it('parses multiple adjacent hashtags', () => {
      const result = parseContent('#daily #facts');
      expect(result).toEqual([
        { type: 'hashtag', content: '#daily' },
        { type: 'text', content: ' ' },
        { type: 'hashtag', content: '#facts' },
      ]);
    });
  });

  describe('mentions', () => {
    it('parses user mentions', () => {
      const result = parseContent('Thanks to @rodac for sharing');
      expect(result).toEqual([
        { type: 'text', content: 'Thanks to ' },
        { type: 'mention', content: '@rodac' },
        { type: 'text', content: ' for sharing' },
      ]);
    });

    it('supports usernames with dots', () => {
      const result = parseContent('Hello @miguel.rodac welcome!');
      expect(result).toEqual([
        { type: 'text', content: 'Hello ' },
        { type: 'mention', content: '@miguel.rodac' },
        { type: 'text', content: ' welcome!' },
      ]);
    });
  });

  describe('urls', () => {
    it('parses https and http URLs and sets normalized url', () => {
      const result = parseContent('Visit https://rodac.dev and http://facts.com');
      expect(result).toEqual([
        { type: 'text', content: 'Visit ' },
        { type: 'url', content: 'https://rodac.dev', url: 'https://rodac.dev' },
        { type: 'text', content: ' and ' },
        { type: 'url', content: 'http://facts.com', url: 'http://facts.com' },
      ]);
    });

    it('normalizes www URLs prepending https://', () => {
      const result = parseContent('Go to www.google.com now');
      expect(result).toEqual([
        { type: 'text', content: 'Go to ' },
        { type: 'url', content: 'www.google.com', url: 'https://www.google.com' },
        { type: 'text', content: ' now' },
      ]);
    });

    it('strips trailing punctuation from URLs and pushes it as plain text', () => {
      const result = parseContent('Check https://example.com/page.');
      expect(result).toEqual([
        { type: 'text', content: 'Check ' },
        { type: 'url', content: 'https://example.com/page', url: 'https://example.com/page' },
        { type: 'text', content: '.' },
      ]);
    });
  });

  describe('mixed content', () => {
    it('accurately parses combination of mentions, hashtags, URLs, and surrounding text', () => {
      const input = 'Hey @rodac, did you see #tech news on https://news.ycombinator.com? Amazing!';
      const result = parseContent(input);

      expect(result).toEqual([
        { type: 'text', content: 'Hey ' },
        { type: 'mention', content: '@rodac' },
        { type: 'text', content: ', did you see ' },
        { type: 'hashtag', content: '#tech' },
        { type: 'text', content: ' news on ' },
        { type: 'url', content: 'https://news.ycombinator.com', url: 'https://news.ycombinator.com' },
        { type: 'text', content: '?' },
        { type: 'text', content: ' Amazing!' },
      ]);
    });
  });
});
