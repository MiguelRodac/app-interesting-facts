import { useCallback, useEffect, useRef, useState } from 'react';
import type { Fact } from '@/types';
import { createApiClient } from '@/data/api/client';
import { getIdToken } from '@/data/auth/firebaseAuth';
import type { ApiFactFeedItem, ApiPaginatedResponse } from '@/data/api/types';
import { mapFactsDtos } from '@/data/mappers/factMapper';

const client = createApiClient(getIdToken);

/** Shape returned by the mentioned-facts hook. */
export interface MentionedFactsState {
  mentionedFacts: Fact[];
  mentionsLoading: boolean;
  mentionsCount: number;
  refetch: () => void;
}

/**
 * Fetches facts that mention the current user via GET /users/:username/mentions.
 * The hook fetches on mount/focus and exposes loading + cached list.
 */
export function useMentionedFacts(username?: string): MentionedFactsState {
  const [mentionedFacts, setMentionedFacts] = useState<Fact[]>([]);
  const [mentionsLoading, setMentionedLoading] = useState(false);
  const activeRef = useRef(true);

  const fetchMentions = useCallback(() => {
    if (!username) return;
    setMentionedLoading(true);
    client
      .get<ApiPaginatedResponse<ApiFactFeedItem>>(`/users/${username}/mentions`, {
        page: '1',
        limit: '50',
      })
      .then((data) => {
        const facts = mapFactsDtos(data.results ?? []);
        if (activeRef.current) setMentionedFacts(facts);
      })
      .catch(() => {
        if (activeRef.current) setMentionedFacts([]);
      })
      .finally(() => {
        if (activeRef.current) setMentionedLoading(false);
      });
  }, [username]);

  useEffect(() => {
    activeRef.current = true;
    fetchMentions();
    return () => {
      activeRef.current = false;
    };
  }, [fetchMentions]);

  return {
    mentionedFacts,
    mentionsLoading,
    mentionsCount: mentionedFacts.length,
    refetch: fetchMentions,
  };
}
