import { useCallback, useEffect, useState } from 'react';
import { createApiClient } from '@/data/api/client';
import type { ApiCommentsResponse } from '@/data/api/types';
import { getIdToken } from '@/data/auth/firebaseAuth';
import { mapCommentsDtos } from '@/data/mappers/commentMapper';
import type { Comment } from '@/types';

const client = createApiClient(getIdToken);

/**
 * Module-level cache for repost comments, keyed by repostId. Same pattern
 * as useFactComments: fetch once per session, invalidate on mutation,
 * optimistic update support via getCached/setCached.
 */
const commentsCache = new Map<string, Comment[]>();

type Listener = (refetch: boolean) => void;
const listeners = new Map<string, Set<Listener>>();

export function notifyRepostCommentsChanged(repostId: string): void {
  commentsCache.delete(repostId);
  listeners.get(repostId)?.forEach((listener) => listener(true));
}

export function notifyRepostCommentsOptimistic(repostId: string): void {
  listeners.get(repostId)?.forEach((listener) => listener(false));
}

export function getCachedRepostComments(repostId: string): Comment[] {
  return commentsCache.get(repostId) ?? [];
}

export function setCachedRepostComments(repostId: string, comments: Comment[]): void {
  commentsCache.set(repostId, comments);
}

export function clearRepostCommentsCache(): void {
  commentsCache.clear();
  listeners.forEach((set) => set.forEach((listener) => listener(true)));
}

function subscribe(repostId: string, listener: (refetch: boolean) => void): () => void {
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

export function useRepostComments(
  repostId: string | null | undefined,
  enabled = true,
): { comments: Comment[]; loading: boolean; refetch: () => void } {
  const [comments, setComments] = useState<Comment[]>(() =>
    repostId ? (commentsCache.get(repostId) ?? []) : [],
  );
  const [loading, setLoading] = useState(() => !!repostId && enabled);

  const fetchFresh = useCallback(() => {
    if (!repostId) return;
    setLoading(true);
    client
      .get<ApiCommentsResponse>(`/reposts/${repostId}/comments`)
      .then((data) => {
        const list = normalize(data);
        commentsCache.set(repostId, list);
        setComments(list);
      })
      .catch(() => {
        setComments(commentsCache.get(repostId) ?? []);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [repostId]);

  useEffect(() => {
    if (!repostId || !enabled) {
      setComments([]);
      return;
    }
    let active = true;
    const onChanged = (refetch: boolean) => {
      if (!active) return;
      if (refetch) {
        fetchFresh();
      } else {
        const cached = commentsCache.get(repostId);
        if (cached) setComments(cached);
      }
    };
    fetchFresh();
    const unsubscribe = subscribe(repostId, onChanged);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [repostId, enabled, fetchFresh]);

  return { comments, loading, refetch: fetchFresh };
}
