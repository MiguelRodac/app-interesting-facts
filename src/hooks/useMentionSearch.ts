import { useState, useRef, useCallback } from 'react';
import { createApiClient } from '@/data/api/client';
import { getIdToken } from '@/data/auth/firebaseAuth';
import type { ApiUserSearchResult, ApiUser } from '@/data/api/types';

const client = createApiClient(getIdToken);

export function useMentionSearch() {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<ApiUserSearchResult[]>([]);
  const [isSearchingMentions, setIsSearchingMentions] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const mentionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef('');

  const searchMentions = useCallback((query: string) => {
    latestQueryRef.current = query;

    if (mentionTimeoutRef.current) {
      clearTimeout(mentionTimeoutRef.current);
    }

    if (query.length < 1) {
      setMentionResults([]);
      setShowMentions(false);
      return;
    }

    mentionTimeoutRef.current = setTimeout(async () => {
      const currentQuery = latestQueryRef.current;
      if (currentQuery.length < 1) {
        setMentionResults([]);
        setShowMentions(false);
        return;
      }

      setIsSearchingMentions(true);
      try {
        const response = await client.get<ApiUserSearchResult[] | { results: ApiUserSearchResult[] }>(
          '/users/search',
          { q: currentQuery }
        );
        let results = Array.isArray(response) ? response : response.results ?? [];

        if (currentQuery.includes('.')) {
          try {
            const exact = await client.get<ApiUser>(`/users/${encodeURIComponent(currentQuery)}`);
            if (exact && exact.username) {
              const exactUser: ApiUserSearchResult = {
                id: exact.id,
                username: exact.username,
                displayName: exact.displayName,
                avatarUrl: exact.avatarUrl ?? null,
                avatarColor: exact.avatarColor,
              };
              results = [exactUser, ...results.filter((r) => r.username !== exactUser.username)];
            }
          } catch {
            // 404 exact match not found
          }
        }

        const normalizedQuery = currentQuery.toLowerCase();
        results = results.filter((r) => r.username.toLowerCase().includes(normalizedQuery));
        setMentionResults(results);
        setSelectedMentionIndex(0);
      } catch {
        setMentionResults([]);
      } finally {
        setIsSearchingMentions(false);
      }
    }, 500);
  }, []);

  const closeMentions = useCallback(() => {
    if (mentionTimeoutRef.current) {
      clearTimeout(mentionTimeoutRef.current);
    }
    setShowMentions(false);
    setMentionResults([]);
    setSelectedMentionIndex(0);
  }, []);

  const applyMention = useCallback(
    (currentText: string, cursorPos: number, user: ApiUserSearchResult) => {
      const lastAtIndex = currentText.lastIndexOf('@', cursorPos);
      if (lastAtIndex === -1) {
        return { newContent: currentText, newCursor: cursorPos };
      }

      const before = currentText.substring(0, lastAtIndex);
      const after = currentText.substring(cursorPos);
      const newContent = `${before}@${user.username} ${after}`;
      const newCursor = lastAtIndex + user.username.length + 2;

      closeMentions();
      return { newContent, newCursor };
    },
    [closeMentions]
  );

  return {
    showMentions,
    setShowMentions,
    mentionQuery,
    setMentionQuery,
    mentionResults,
    setMentionResults,
    isSearchingMentions,
    selectedMentionIndex,
    setSelectedMentionIndex,
    searchMentions,
    closeMentions,
    applyMention,
  };
}
