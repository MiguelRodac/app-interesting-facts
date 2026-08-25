import { useCallback, useEffect, useState } from 'react';
import { createApiClient } from '@/data/api/client';
import { getIdToken } from '@/data/auth/firebaseAuth';
import type { ApiFactLike } from '@/data/api/types';

const client = createApiClient(getIdToken);

/**
 * Module-level cache for repost comment likes, keyed by `${repostId}:${commentId}`.
 * Same pattern as useCommentLikes.
 */
const likesCache = new Map<string, ApiFactLike[]>();

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

export function notifyRepostCommentLikesChanged(repostId: string, commentId: string): void {
  const cacheKey = `${repostId}:${commentId}`;
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

export function useRepostCommentLikes(
  repostId: string | null | undefined,
  commentId: string | null | undefined,
  enabled = true,
) {
  const cacheKey = repostId && commentId ? `${repostId}:${commentId}` : null;
  const [likes, setLikes] = useState<ApiFactLike[]>(() =>
    cacheKey ? (likesCache.get(cacheKey) ?? []) : [],
  );

  const fetchFresh = useCallback((): Promise<void> => {
    if (!repostId || !commentId) return Promise.resolve();
    const key = `${repostId}:${commentId}`;
    return client
      .get<ApiFactLike[] | { results?: ApiFactLike[] }>(
        `/reposts/${repostId}/comments/${commentId}/likes`,
      )
      .then((data) => {
        const list = normalize(data);
        likesCache.set(key, list);
        setLikes(list);
      })
      .catch(() => {
        setLikes(likesCache.get(key) ?? []);
      });
  }, [repostId, commentId]);

  useEffect(() => {
    if (!repostId || !commentId || !enabled) {
      setLikes([]);
      return;
    }
    let active = true;
    const onChanged = () => {
      if (active) fetchFresh();
    };
    fetchFresh();
    const unsubscribe = subscribe(`${repostId}:${commentId}`, onChanged);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [repostId, commentId, enabled, fetchFresh]);

  return { likes, refetch: fetchFresh };
}
