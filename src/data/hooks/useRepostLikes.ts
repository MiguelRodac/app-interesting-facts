import { useCallback, useEffect, useState } from 'react';
import { createApiClient } from '@/data/api/client';
import { getIdToken } from '@/data/auth/firebaseAuth';
import type { ApiFactLike } from '@/data/api/types';

const client = createApiClient(getIdToken);

/**
 * Module-level cache for repost likes, keyed by repostId. Same pattern as
 * useFactLikes: fetch once per session, invalidate on toggle, refetch on open.
 */
const likesCache = new Map<string, ApiFactLike[]>();

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

/**
 * Called after a successful repost like toggle: the cached entry is dropped
 * and every mounted useRepostLikes for that repostId refetches.
 */
export function notifyRepostLikesChanged(repostId: string): void {
  likesCache.delete(repostId);
  listeners.get(repostId)?.forEach((listener) => listener());
}

function subscribe(repostId: string, listener: Listener): () => void {
  let set = listeners.get(repostId);
  if (!set) {
    set = new Set();
    listeners.set(repostId, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(repostId);
  };
}

function normalize(data: ApiFactLike[] | { results?: ApiFactLike[] }): ApiFactLike[] {
  const raw = Array.isArray(data) ? data : data?.results;
  return Array.isArray(raw) ? raw : [];
}

export function useRepostLikes(repostId: string | null | undefined, enabled = true) {
  const [likes, setLikes] = useState<ApiFactLike[]>(() =>
    repostId ? (likesCache.get(repostId) ?? []) : [],
  );

  const fetchFresh = useCallback((): Promise<void> => {
    if (!repostId) return Promise.resolve();
    return client
      .get<ApiFactLike[] | { results?: ApiFactLike[] }>(`/reposts/${repostId}/likes`)
      .then((data) => {
        const list = normalize(data);
        likesCache.set(repostId, list);
        setLikes(list);
      })
      .catch(() => {
        setLikes(likesCache.get(repostId) ?? []);
      });
  }, [repostId]);

  useEffect(() => {
    if (!repostId || !enabled) {
      setLikes([]);
      return;
    }
    let active = true;
    const onChanged = () => {
      if (active) fetchFresh();
    };
    fetchFresh();
    const unsubscribe = subscribe(repostId, onChanged);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [repostId, enabled, fetchFresh]);

  return { likes, refetch: fetchFresh };
}
