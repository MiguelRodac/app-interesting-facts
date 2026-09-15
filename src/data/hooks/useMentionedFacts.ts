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
  mentionsLoadingMore: boolean;
  hasMore: boolean;
  mentionsCount: number;
  refetch: (silent?: boolean) => void;
  loadMore: () => Promise<void>;
}

/**
 * Fetches facts and reposts that mention the given user via GET /users/:username/mentions.
 * The endpoint returns standard FeedEntry[] (ResultWithPagination<FeedEntry>).
 * The hook fetches on mount/focus and exposes loading + cached list + total count.
 */
export function useMentionedFacts(username?: string): MentionedFactsState {
  const [mentionedFacts, setMentionedFacts] = useState<Fact[]>([]);
  const [mentionsLoading, setMentionedLoading] = useState(() => !!username);
  const [mentionsLoadingMore, setMentionsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [mentionsCount, setMentionsCount] = useState(0);
  const activeRef = useRef(true);
  const inFlightRef = useRef(false);
  const mentionedFactsRef = useRef<Fact[]>(mentionedFacts);
  useEffect(() => {
    mentionedFactsRef.current = mentionedFacts;
  }, [mentionedFacts]);

  const fetchMentions = useCallback((silent?: boolean) => {
    if (!username || inFlightRef.current) return;
    inFlightRef.current = true;
    if (!silent || mentionedFactsRef.current.length === 0) setMentionedLoading(true);
    client
      .get<ApiPaginatedResponse<ApiFactFeedItem>>(`/users/${username}/mentions`, {
        page: '1',
        limit: '50',
      })
      .then((data) => {
        const facts = mapFactsDtos(data.results ?? []);
        if (activeRef.current) {
          setMentionedFacts(facts);
          setMentionsCount(data.total ?? facts.length);
          setPage(1);
          setHasMore(data.nextPage !== null);
        }
      })
      .catch(() => {
        if (activeRef.current) {
          setMentionedFacts([]);
          setMentionsCount(0);
        }
      })
      .finally(() => {
        inFlightRef.current = false;
        if (activeRef.current) setMentionedLoading(false);
      });
  }, [username]);

  const loadMore = useCallback(async () => {
    if (!username || mentionsLoading || mentionsLoadingMore || !hasMore || mentionedFactsRef.current.length === 0) return;
    setMentionsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const data = await client.get<ApiPaginatedResponse<ApiFactFeedItem>>(`/users/${username}/mentions`, {
        page: String(nextPage),
        limit: '50',
      });
      if (activeRef.current) {
        const incoming = mapFactsDtos(data.results ?? []);
        setMentionedFacts((prev) => {
          const byId = new Map(prev.map((item) => [item.id, item]));
          for (const item of incoming) {
            byId.set(item.id, item);
          }
          return Array.from(byId.values());
        });
        setPage(nextPage);
        setHasMore(data.nextPage !== null);
      }
    } catch {
      // Keep existing entries on error
    } finally {
      if (activeRef.current) {
        setMentionsLoadingMore(false);
      }
    }
  }, [username, mentionsLoading, mentionsLoadingMore, hasMore, page]);

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
    mentionsLoadingMore,
    hasMore,
    mentionsCount,
    refetch: fetchMentions,
    loadMore,
  };
}
