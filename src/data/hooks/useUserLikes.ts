import { useCallback, useEffect, useRef, useState } from 'react';
import type { Fact } from '@/types';
import { createApiClient } from '@/data/api/client';
import { getIdToken } from '@/data/auth/firebaseAuth';
import type { ApiFactFeedItem, ApiPaginatedResponse } from '@/data/api/types';
import { mapFactsDtos } from '@/data/mappers/factMapper';
import { applyEntryUpdate, subscribeEntryUpdates } from './entryUpdateBus';

const client = createApiClient(getIdToken);

/** Shape returned by the user-likes hook. */
export interface UserLikesState {
  likedEntries: Fact[];
  likesLoading: boolean;
  likesLoadingMore: boolean;
  hasMore: boolean;
  likesCount: number;
  /** Re-fetches the list. Silent refreshes skip the loading spinner (feed pattern). */
  refetch: (silent?: boolean) => void;
  /** Loads the next page of liked entries (limit 50). */
  loadMore: () => Promise<void>;
}

/**
 * Fetches everything a user has liked via GET /users/:userId/likes.
 * Returns enriched FeedEntry[] (facts + reposts) — the backend already
 * sorts by like date (newest first), so the API order is preserved.
 * Fetches on mount/user change; refetch() re-runs manually.
 */
export function useUserLikes(userId?: string | null): UserLikesState {
  const [likedEntries, setLikedEntries] = useState<Fact[]>([]);
  const [likesLoading, setLikesLoading] = useState(() => !!userId);
  const [likesLoadingMore, setLikesLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const activeRef = useRef(true);
  const inFlightRef = useRef(false);
  const likedEntriesRef = useRef<Fact[]>(likedEntries);
  useEffect(() => {
    likedEntriesRef.current = likedEntries;
  }, [likedEntries]);

  const fetchLikes = useCallback((silent?: boolean) => {
    if (!userId || inFlightRef.current) return;
    inFlightRef.current = true;
    if (!silent || likedEntriesRef.current.length === 0) setLikesLoading(true);
    client
      .get<ApiPaginatedResponse<ApiFactFeedItem>>(`/users/${userId}/likes`, {
        page: '1',
        limit: '50',
      })
      .then((data) => {
        if (activeRef.current) {
          setLikedEntries(mapFactsDtos(data.results ?? []));
          setPage(1);
          setHasMore(data.nextPage !== null);
        }
      })
      .catch(() => {
        if (activeRef.current) setLikedEntries([]);
      })
      .finally(() => {
        inFlightRef.current = false;
        if (activeRef.current) setLikesLoading(false);
      });
  }, [userId]);

  const loadMore = useCallback(async () => {
    if (!userId || likesLoading || likesLoadingMore || !hasMore || likedEntriesRef.current.length === 0) return;
    setLikesLoadingMore(true);
    const nextPage = page + 1;
    try {
      const data = await client.get<ApiPaginatedResponse<ApiFactFeedItem>>(`/users/${userId}/likes`, {
        page: String(nextPage),
        limit: '50',
      });
      if (activeRef.current) {
        const incoming = mapFactsDtos(data.results ?? []);
        setLikedEntries((prev) => {
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
        setLikesLoadingMore(false);
      }
    }
  }, [userId, likesLoading, likesLoadingMore, hasMore, page]);

  useEffect(() => {
    activeRef.current = true;
    fetchLikes();
    return () => {
      activeRef.current = false;
    };
  }, [fetchLikes]);

  // Live-update: like/repost actions elsewhere broadcast patches — apply them
  // to this list so cards react instantly in the Liked tab too.
  useEffect(
    () =>
      subscribeEntryUpdates((scope, anchor, patch) => {
        setLikedEntries((prev) => applyEntryUpdate(prev, scope, anchor, patch));
      }),
    [],
  );

  return {
    likedEntries,
    likesLoading,
    likesLoadingMore,
    hasMore,
    likesCount: likedEntries.length,
    refetch: fetchLikes,
    loadMore,
  };
}
