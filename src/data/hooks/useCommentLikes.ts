import { useCallback, useEffect, useState } from 'react';
import { createApiClient } from '@/data/api/client';
import { getIdToken } from '@/data/auth/firebaseAuth';
import type { ApiFactLike } from '@/data/api/types';

const client = createApiClient(getIdToken);

/**
 * Module-level cache keyed by `${factId}:${commentId}` — comments render one
 * like count per row, and every open of the modal would fetch the whole list
 * again, so each pair is fetched once per session. The modal refetches on
 * open and comment-like toggles invalidate the entry (see
 * notifyCommentLikesChanged).
 */
const likesCache = new Map<string, ApiFactLike[]>();

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

/**
 * Called by the comments store after a successful comment-like toggle: the
 * cached entry is dropped and every mounted useCommentLikes for that
 * factId:commentId refetches, so the comment likes modal shows live data. If
 * no hook is mounted anymore, the cache invalidation still guarantees the
 * next mount fetches fresh.
 */
export function notifyCommentLikesChanged(factId: string, commentId: string): void {
  const cacheKey = `${factId}:${commentId}`;
  likesCache.delete(cacheKey);
  listeners.get(cacheKey)?.forEach((listener) => listener());
}

function subscribe(cacheKey: string, listener: Listener): () => void {
  let set = listeners.get(cacheKey);
  if (!set) {
    set = new Set();
    listeners.set(cacheKey, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(cacheKey);
  };
}

function normalize(data: ApiFactLike[] | { results?: ApiFactLike[] }): ApiFactLike[] {
  const raw = Array.isArray(data) ? data : data?.results;
  return Array.isArray(raw) ? raw : [];
}

export function useCommentLikes(
  factId: string | null | undefined,
  commentId: string | null | undefined,
  enabled = true,
) {
  const cacheKey = factId && commentId ? `${factId}:${commentId}` : null;
  const [likes, setLikes] = useState<ApiFactLike[]>(() =>
    cacheKey ? (likesCache.get(cacheKey) ?? []) : [],
  );

  const fetchFresh = useCallback(() => {
    if (!factId || !commentId) return;
    const key = `${factId}:${commentId}`;
    client
      .get<ApiFactLike[] | { results?: ApiFactLike[] }>(
        `/facts/${factId}/comments/${commentId}/likes`,
      )
      .then((data) => {
        const list = normalize(data);
        likesCache.set(key, list);
        setLikes(list);
      })
      .catch(() => {
        // Backend unavailable — keep whatever the cache has
        setLikes(likesCache.get(key) ?? []);
      });
  }, [factId, commentId]);

  useEffect(() => {
    if (!factId || !commentId || !enabled) {
      // Comment no longer qualifies (e.g. closed modal) — drop any stale
      // list from the previous state so no ghost likes remain.
      setLikes([]);
      return;
    }
    let active = true;
    const onChanged = () => {
      if (active) fetchFresh();
    };
    fetchFresh();
    const unsubscribe = subscribe(`${factId}:${commentId}`, onChanged);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [factId, commentId, enabled, fetchFresh]);

  return { likes, refetch: fetchFresh };
}