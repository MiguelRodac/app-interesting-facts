import { useCallback, useEffect, useRef, useState } from 'react';
import type { Fact } from '@/types';
import { createApiClient } from '@/data/api/client';
import { getIdToken } from '@/data/auth/firebaseAuth';
import type { ApiFactFeedItem, ApiPaginatedResponse } from '@/data/api/types';
import { mapFactsDtos } from '@/data/mappers/factMapper';
import { applyEntryUpdate, subscribeEntryUpdates } from './entryUpdateBus';

const client = createApiClient(getIdToken);

/** Shape returned by the mentioned-facts hook. */
export interface MentionedFactsState {
  mentionedFacts: Fact[];
  mentionsLoading: boolean;
  mentionsCount: number;
  refetch: (silent?: boolean) => void;
}

/**
 * Fetches facts and reposts that mention the given user via GET /users/:username/mentions.
 * The endpoint returns standard FeedEntry[] (ResultWithPagination<FeedEntry>).
 * The hook fetches on mount/focus and exposes loading + cached list + total count.
 */
export function useMentionedFacts(username?: string): MentionedFactsState {
  const [mentionedFacts, setMentionedFacts] = useState<Fact[]>([]);
  const [mentionsLoading, setMentionedLoading] = useState(() => !!username);
  const [mentionsCount, setMentionsCount] = useState(0);
  const activeRef = useRef(true);

  const fetchMentions = useCallback((silent?: boolean) => {
    if (!username) return;
    if (!silent || mentionedFacts.length === 0) setMentionedLoading(true);
    client
      .get<ApiPaginatedResponse<ApiFactFeedItem>>(`/users/${username}/mentions`, {
        page: '1',
        limit: '20',
      })
      .then((data) => {
        const facts = mapFactsDtos(data.results ?? []);
        if (activeRef.current) {
          setMentionedFacts(facts);
          setMentionsCount(data.total ?? facts.length);
        }
      })
      .catch(() => {
        if (activeRef.current) {
          setMentionedFacts([]);
          setMentionsCount(0);
        }
      })
      .finally(() => {
        if (activeRef.current) setMentionedLoading(false);
      });
  }, [username, mentionedFacts.length]);

  useEffect(() => {
    activeRef.current = true;
    fetchMentions();
    return () => {
      activeRef.current = false;
    };
  }, [fetchMentions]);

  // Live-update: like/repost actions elsewhere broadcast patches — apply them
  // to this list so cards react instantly in the Mentions tab too.
  useEffect(
    () =>
      subscribeEntryUpdates((scope, anchor, patch) => {
        setMentionedFacts((prev) => applyEntryUpdate(prev, scope, anchor, patch));
      }),
    [],
  );

  return {
    mentionedFacts,
    mentionsLoading,
    mentionsCount,
    refetch: fetchMentions,
  };
}
