import { useCallback, useEffect, useState } from 'react';
import { createApiClient } from '@/data/api/client';
import { getIdToken } from '@/data/auth/firebaseAuth';
import type { ApiFactLike } from '@/data/api/types';

const client = createApiClient(getIdToken);

/**
 * Module-level cache: the feed renders one card per fact, so fetching
 * likes for every card on every visit would be N+1. Cache means each
 * factId is fetched once per session; the modal refetches on open and
 * like toggles invalidate the entry (see notifyFactLikesChanged).
 */
const likesCache = new Map<string, ApiFactLike[]>();

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

/**
 * Called by the store after a successful like toggle: the cached entry is
 * dropped and every mounted useFactLikes for that factId refetches, so
 * "Liked by …" lines update live across all screens (feed, detail, profile,
 * search). If no hook is mounted anymore (e.g. the fact dropped to 0 likes),
 * the cache invalidation still guarantees the next mount fetches fresh.
 */
export function notifyFactLikesChanged(factId: string): void {
  likesCache.delete(factId);
  listeners.get(factId)?.forEach((listener) => listener());
}

function subscribe(factId: string, listener: Listener): () => void {
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

function normalize(data: ApiFactLike[] | { results?: ApiFactLike[] }): ApiFactLike[] {
  const raw = Array.isArray(data) ? data : data?.results;
  return Array.isArray(raw) ? raw : [];
}

export function useFactLikes(factId: string | null | undefined, enabled = true) {
  const [likes, setLikes] = useState<ApiFactLike[]>(() =>
    factId ? (likesCache.get(factId) ?? []) : [],
  );

  const fetchFresh = useCallback(() => {
    if (!factId) return;
    client
      .get<ApiFactLike[] | { results?: ApiFactLike[] }>(`/facts/${factId}/likes`)
      .then((data) => {
        const list = normalize(data);
        likesCache.set(factId, list);
        setLikes(list);
      })
      .catch(() => {
        // Backend unavailable — keep whatever the cache has
        setLikes(likesCache.get(factId) ?? []);
      });
  }, [factId]);

  useEffect(() => {
    if (!factId || !enabled) {
      // Fact no longer qualifies (e.g. 0 likes after a dislike) — drop any
      // stale line from the previous state so no ghost likes remain.
      setLikes([]);
      return;
    }
    let active = true;
    const onChanged = () => {
      if (active) fetchFresh();
    };
    fetchFresh();
    const unsubscribe = subscribe(factId, onChanged);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [factId, enabled, fetchFresh]);

  return { likes, refetch: fetchFresh };
}
