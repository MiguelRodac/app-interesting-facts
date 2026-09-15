import { useState, useRef, useCallback } from 'react';
import { createApiClient } from '@/data/api/client';
import { getIdToken } from '@/data/auth/firebaseAuth';
import type { ApiHashtag } from '@/data/api/types';

const client = createApiClient(getIdToken);

export function useHashtagSearch() {
  const [showHashtags, setShowHashtags] = useState(false);
  const [hashtagQuery, setHashtagQuery] = useState('');
  const [hashtagResults, setHashtagResults] = useState<ApiHashtag[]>([]);
  const [isSearchingHashtags, setIsSearchingHashtags] = useState(false);
  const [selectedHashtagIndex, setSelectedHashtagIndex] = useState(0);

  const hashtagTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef('');

  const searchHashtags = useCallback((query: string) => {
    latestQueryRef.current = query;

    if (hashtagTimeoutRef.current) {
      clearTimeout(hashtagTimeoutRef.current);
    }

    if (query.length < 1) {
      setHashtagResults([]);
      setShowHashtags(false);
      return;
    }

    hashtagTimeoutRef.current = setTimeout(async () => {
      const currentQuery = latestQueryRef.current;
      if (currentQuery.length < 1) {
        setHashtagResults([]);
        setShowHashtags(false);
        return;
      }

      setIsSearchingHashtags(true);
      try {
        const response = await client.get<{ results: ApiHashtag[] }>('/hashtags', {
          q: currentQuery,
          limit: '5',
        });
        setHashtagResults(response.results ?? []);
        setSelectedHashtagIndex(0);
      } catch {
        setHashtagResults([]);
      } finally {
        setIsSearchingHashtags(false);
      }
    }, 500);
  }, []);

  const closeHashtags = useCallback(() => {
    if (hashtagTimeoutRef.current) {
      clearTimeout(hashtagTimeoutRef.current);
    }
    setShowHashtags(false);
    setHashtagResults([]);
    setSelectedHashtagIndex(0);
  }, []);

  const applyHashtag = useCallback(
    (currentText: string, cursorPos: number, hashtag: ApiHashtag) => {
      const lastHashIndex = currentText.lastIndexOf('#', cursorPos);
      if (lastHashIndex === -1) {
        return { newContent: currentText, newCursor: cursorPos };
      }

      const before = currentText.substring(0, lastHashIndex);
      const after = currentText.substring(cursorPos);
      const newContent = `${before}#${hashtag.tag} ${after}`;
      const newCursor = lastHashIndex + hashtag.tag.length + 2;

      closeHashtags();
      return { newContent, newCursor };
    },
    [closeHashtags]
  );

  return {
    showHashtags,
    setShowHashtags,
    hashtagQuery,
    setHashtagQuery,
    hashtagResults,
    setHashtagResults,
    isSearchingHashtags,
    selectedHashtagIndex,
    setSelectedHashtagIndex,
    searchHashtags,
    closeHashtags,
    applyHashtag,
  };
}
