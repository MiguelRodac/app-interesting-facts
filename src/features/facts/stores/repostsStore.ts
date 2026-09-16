import { create } from 'zustand';
import type { AppError, Comment, Fact } from '@/types';
import { createApiClient } from '@/shared/api/client';
import type { ApiComment } from '@/shared/api/types';
import { getIdToken } from '@/features/auth/services/firebaseAuth';
import {
  clearRepostCommentsCache,
  getCachedRepostComments,
  notifyRepostCommentsChanged,
  notifyRepostCommentsOptimistic,
  setCachedRepostComments,
} from '../hooks/useRepostComments';
import { notifyRepostCommentLikesChanged } from '../hooks/useRepostCommentLikes';
import { notifyRepostLikesChanged } from '../hooks/useRepostLikes';
import { broadcastEntryUpdate } from '@/shared/events/entryUpdateBus';
import { mapCommentDto } from '@/features/comments/mappers/commentMapper';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useFactsStore } from './factsStore';
import { useUIStore } from '@/shared/stores/uiStore';
import {
  buildOptimisticComment,
  mapComment,
  removeComment,
  insertReply,
  findRepostEntry,
} from './repostsStoreHelpers';

const client = createApiClient(getIdToken);

/**
 * Builds the optimistic liked-by list for the current user's repost like/
 * unlike — same policy as factsStore: prepend on like (capped at 3, the
 * number LikedByLine renders), drop on unlike.
 */
function optimisticRepostLikeBy(
  likeBy: NonNullable<Fact['likeBy']>,
  user: { username: string; avatarUrl?: string | null; avatarColor?: string | null } | null,
  liked: boolean,
): Fact['likeBy'] {
  if (!user) return likeBy;
  const withoutUser = likeBy.filter((l) => l.username !== user.username);
  if (!liked) return withoutUser;
  return [
    { username: user.username, avatarUrl: user.avatarUrl, avatarColor: user.avatarColor },
    ...withoutUser,
  ].slice(0, 3);
}

/**
 * Updates the repost's counts on the Fact in factsStore so the feed card
 * reflects the change immediately.
 */
function applyRepostFactUpdate(
  repostEntryId: string,
  patch: Partial<Pick<Fact, 'repostLikeCount' | 'repostLiked' | 'repostCommentCount' | 'likeBy'>>,
) {
  const factsState = useFactsStore.getState();
  const snapFacts = factsState.facts;
  const snapUserFacts = factsState.userFacts;

  const update = (f: Fact): Fact => (f.id === repostEntryId ? { ...f, ...patch } : f);
  useFactsStore.setState({
    facts: snapFacts.map(update),
    userFacts: snapUserFacts.map(update),
  });

  return { snapFacts, snapUserFacts };
}

function rollbackRepostFact(snapFacts: Fact[], snapUserFacts: Fact[]) {
  useFactsStore.setState({ facts: snapFacts, userFacts: snapUserFacts });
}

interface RepostsState {
  toggleRepostLike: (repostEntryId: string, fallbackFact?: Fact) => Promise<void>;
  addRepostComment: (repostEntryId: string, content: string, parentCommentId?: string | null) => Promise<void>;
  updateRepostComment: (repostEntryId: string, commentId: string, content: string) => Promise<void>;
  deleteRepostComment: (repostEntryId: string, commentId: string) => Promise<void>;
  toggleRepostCommentLike: (repostEntryId: string, comment: Comment) => Promise<void>;
  reset: () => void;
}

/**
 * Write-side for the reposts module — repost likes and repost comments.
 * Reads the repost Fact from factsStore to get the current counts, applies
 * optimistic updates, fires API calls, and rolls back on error.
 */
const repostLikesInFlight = new Set<string>();

export const useRepostsStore = create<RepostsState>(() => ({
  toggleRepostLike: async (repostEntryId: string, fallbackFact?: Fact) => {
    if (repostLikesInFlight.has(repostEntryId)) {
      return;
    }
    repostLikesInFlight.add(repostEntryId);

    const fact = findRepostEntry(repostEntryId) ?? fallbackFact;
    if (!fact) {
      repostLikesInFlight.delete(repostEntryId);
      return;
    }

    const wasLiked = fact.repostLiked;
    const currentUser = useAuthStore.getState().user;

    // Optimistic update — count AND the inline liked-by line, mirroring the
    // facts pattern so LikedByLine avatars update instantly on the card.
    const likePatch = {
      repostLiked: !wasLiked,
      repostLikeCount: fact.repostLikeCount + (wasLiked ? -1 : 1),
      likeBy: optimisticRepostLikeBy(fact.likeBy ?? [], currentUser, !wasLiked),
    };
    const { snapFacts, snapUserFacts } = applyRepostFactUpdate(repostEntryId, likePatch);
    broadcastEntryUpdate('repost-entry', { id: repostEntryId }, likePatch);

    try {
      if (wasLiked) {
        await client.del(`/reposts/${repostEntryId}/likes`);
      } else {
        await client.post(`/reposts/${repostEntryId}/likes`);
      }
      notifyRepostLikesChanged(repostEntryId);
    } catch (error) {
      rollbackRepostFact(snapFacts, snapUserFacts);
      broadcastEntryUpdate('repost-entry', { id: repostEntryId }, {
        repostLiked: wasLiked,
        repostLikeCount: fact.repostLikeCount,
        likeBy: fact.likeBy ?? [],
      });
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as AppError);
      }
    } finally {
      repostLikesInFlight.delete(repostEntryId);
    }
  },

  addRepostComment: async (repostEntryId, content, parentCommentId) => {
    const snapshot = getCachedRepostComments(repostEntryId);
    const temp = buildOptimisticComment(content, parentCommentId ?? null);
    const optimistic = parentCommentId
      ? insertReply(snapshot, parentCommentId, temp)
      : [temp, ...snapshot];
    setCachedRepostComments(repostEntryId, optimistic);
    notifyRepostCommentsChanged(repostEntryId);

    // Increment repostCommentCount on the Fact optimistically.
    const currentCount = findRepostEntry(repostEntryId)?.repostCommentCount ?? 0;
    const { snapFacts, snapUserFacts } = applyRepostFactUpdate(repostEntryId, {
      repostCommentCount: currentCount + 1,
    });

    try {
      const created = mapCommentDto(
        await client.post<ApiComment>(`/reposts/${repostEntryId}/comments`, {
          content,
          ...(parentCommentId ? { parentCommentId } : {}),
        }),
      );
      setCachedRepostComments(
        repostEntryId,
        mapComment(getCachedRepostComments(repostEntryId), temp.id, () => created),
      );
      notifyRepostCommentsChanged(repostEntryId);
    } catch (error) {
      setCachedRepostComments(repostEntryId, snapshot);
      rollbackRepostFact(snapFacts, snapUserFacts);
      notifyRepostCommentsChanged(repostEntryId);
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as AppError);
      }
      throw error;
    }
  },

  updateRepostComment: async (repostEntryId, commentId, content) => {
    const snapshot = getCachedRepostComments(repostEntryId);
    const optimistic = { content, edited: true, updatedAt: new Date().toISOString() };
    setCachedRepostComments(
      repostEntryId,
      mapComment(snapshot, commentId, (comment) => ({ ...comment, ...optimistic })),
    );
    notifyRepostCommentsChanged(repostEntryId);

    try {
      const updated = mapCommentDto(
        await client.patch<ApiComment>(`/comments/${commentId}`, { content }),
      );
      setCachedRepostComments(
        repostEntryId,
        mapComment(getCachedRepostComments(repostEntryId), commentId, () => updated),
      );
      notifyRepostCommentsChanged(repostEntryId);
    } catch (error) {
      setCachedRepostComments(repostEntryId, snapshot);
      notifyRepostCommentsChanged(repostEntryId);
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as AppError);
      }
      throw error;
    }
  },

  deleteRepostComment: async (repostEntryId, commentId) => {
    const snapshot = getCachedRepostComments(repostEntryId);
    setCachedRepostComments(repostEntryId, removeComment(snapshot, commentId));
    notifyRepostCommentsChanged(repostEntryId);

    // Decrement repostCommentCount on the Fact optimistically.
    const { snapFacts, snapUserFacts } = applyRepostFactUpdate(repostEntryId, {
      repostCommentCount: Math.max(0, (findRepostEntry(repostEntryId)?.repostCommentCount ?? 1) - 1),
    });

    try {
      await client.del(`/comments/${commentId}`);
      setCachedRepostComments(repostEntryId, removeComment(getCachedRepostComments(repostEntryId), commentId));
      notifyRepostCommentsChanged(repostEntryId);
    } catch (error) {
      setCachedRepostComments(repostEntryId, snapshot);
      rollbackRepostFact(snapFacts, snapUserFacts);
      notifyRepostCommentsChanged(repostEntryId);
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as AppError);
      }
      throw error;
    }
  },

  toggleRepostCommentLike: async (repostEntryId, comment) => {
    const snapshot = getCachedRepostComments(repostEntryId);
    const likeComment = (c: Comment): Comment =>
      c.id === comment.id
        ? {
            ...c,
            liked: !comment.liked,
            likesCount: (c.likesCount ?? 0) + (comment.liked ? -1 : 1),
          }
        : c;

    setCachedRepostComments(
      repostEntryId,
      mapComment(snapshot, comment.id, likeComment),
    );
    notifyRepostCommentsOptimistic(repostEntryId);

    try {
      if (comment.liked) {
        await client.del(`/reposts/${repostEntryId}/comments/${comment.id}/likes`);
      } else {
        await client.post(`/reposts/${repostEntryId}/comments/${comment.id}/likes`);
      }
      notifyRepostCommentLikesChanged(repostEntryId, comment.id);
    } catch (error) {
      setCachedRepostComments(repostEntryId, snapshot);
      notifyRepostCommentsChanged(repostEntryId);
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as AppError);
      }
    }
  },

  reset: () => {
    clearRepostCommentsCache();
  },
}));
