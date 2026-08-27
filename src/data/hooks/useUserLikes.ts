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
  likesCount: number;
  /** Re-fetches the list. Silent refreshes skip the loading spinner (feed pattern). */
  refetch: (silent?: boolean) => void;
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
  const activeRef = useRef(true);

  const fetchLikes = useCallback((silent?: boolean) => {
    if (!userId) return;
    if (!silent || likedEntries.length === 0) setLikesLoading(true);
    client
      .get<ApiPaginatedResponse<ApiFactFeedItem>>(`/users/${userId}/likes`, {
        page: '1',
        limit: '50',
      })
      .then((data) => {
        if (activeRef.current) setLikedEntries(mapFactsDtos(data.results ?? []));
      })
      .catch(() => {
        if (activeRef.current) setLikedEntries([]);
      })
      .finally(() => {
        if (activeRef.current) setLikesLoading(false);
      });
  }, [userId, likedEntries.length]);

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
    likesCount: likedEntries.length,
    refetch: fetchLikes,
  };
}
