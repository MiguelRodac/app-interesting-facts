import { useCallback, useEffect, useState } from 'react';
import { createApiClient } from '@/data/api/client';
import type { ApiCommentsResponse } from '@/data/api/types';
import { getIdToken } from '@/data/auth/firebaseAuth';
import { mapCommentsDtos } from '@/data/mappers/commentMapper';
import type { Comment } from '@/types';

const client = createApiClient(getIdToken);

/**
 * Module-level cache, one entry per factId. The fact screens call
 * useFactComments per card/detail, so without a cache every visit would be
 * an N+1 fetch. The write store (commentsStore) mutates this cache
 * optimistically and invalidates the entry after each mutation (see
 * notifyFactCommentsChanged), so every mounted hook refetches the
 * authoritative threaded list without a full app reload.
 */
const commentsCache = new Map<string, Comment[]>();

type Listener = (refetch: boolean) => void;
const listeners = new Map<string, Set<Listener>>();

/**
 * Called by the comments store after a mutation (add/update/delete): the
 * cached entry is dropped and every mounted useFactComments for that factId
 * refetches. If nothing is mounted anymore, the invalidation still
 * guarantees the next mount fetches fresh.
 */
export function notifyFactCommentsChanged(factId: string): void {
  commentsCache.delete(factId);
  listeners.get(factId)?.forEach((listener) => listener(true));
}

/**
 * Lightweight notification for optimistic updates: pings mounted hooks so
 * they re-read the cache WITHOUT triggering a network refetch. The cache is
 * NOT deleted — the hooks just re-render from the updated cache entry.
 */
export function notifyCommentsOptimistic(factId: string): void {
  listeners.get(factId)?.forEach((listener) => listener(false));
}

/** Store-facing read access to the cached thread for one fact. */
export function getCachedComments(factId: string): Comment[] {
  return commentsCache.get(factId) ?? [];
}

/** Store-facing write access — used to apply optimistic mutations. */
export function setCachedComments(factId: string, comments: Comment[]): void {
  commentsCache.set(factId, comments);
}

/**
 * Clears every cached entry and pings all mounted hooks so they refetch.
 * Used on logout and by commentsStore.reset() — nothing user-specific may
 * survive a session switch.
 */
export function clearCommentsCache(): void {
  commentsCache.clear();
  listeners.forEach((set) => set.forEach((listener) => listener(true)));
}

function subscribe(factId: string, listener: (refetch: boolean) => void): () => void {
  let set = listeners.get(factId);
  if (!set) {
    set = new Set();
    listeners.set(factId, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(factId);
  };
}

/**
 * The backend already orders top-level comments desc and replies asc, but a
 * defensive sort keeps the contract even if a future page/order misses it.
 */
function sortThreaded(comments: Comment[]): Comment[] {
  return comments
    .map((comment) => ({
      ...comment,
      replies: comment.replies
        ? [...comment.replies].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        : comment.replies,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function normalize(data: ApiCommentsResponse): Comment[] {
  return sortThreaded(mapCommentsDtos(data.results));
}

export function useFactComments(
  factId: string | null | undefined,
  enabled = true,
): { comments: Comment[]; loading: boolean; refetch: () => void } {
  const [comments, setComments] = useState<Comment[]>(() =>
    factId ? (commentsCache.get(factId) ?? []) : [],
  );
  const [loading, setLoading] = useState(() => !!factId && enabled);

  const fetchFresh = useCallback(() => {
    if (!factId) return;
    setLoading(true);
    client
      .get<ApiCommentsResponse>(`/facts/${factId}/comments`)
      .then((data) => {
        const list = normalize(data);
        commentsCache.set(factId, list);
        setComments(list);
      })
      .catch(() => {
        setComments(commentsCache.get(factId) ?? []);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [factId]);

  useEffect(() => {
    if (!factId || !enabled) {
      // Fact no longer qualifies — drop any stale thread from the previous
      // state so no ghost comments remain.
      setComments([]);
      return;
    }
    let active = true;
    const onChanged = (refetch: boolean) => {
      if (!active) return;
      if (refetch) {
        // Full invalidation: delete cache + fetch from API.
        fetchFresh();
      } else {
        // Optimistic update: just re-read the cache (no network call).
        const cached = commentsCache.get(factId);
        if (cached) setComments(cached);
      }
    };
    fetchFresh();
    const unsubscribe = subscribe(factId, onChanged);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [factId, enabled, fetchFresh]);

  return { comments, loading, refetch: fetchFresh };
}