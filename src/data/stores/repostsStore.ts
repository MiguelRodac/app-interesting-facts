import { create } from 'zustand';
import type { AppError, Comment, CommentAuthor, Fact } from '@/types';
import { createApiClient } from '@/data/api/client';
import type { ApiComment } from '@/data/api/types';
import { getIdToken } from '@/data/auth/firebaseAuth';
import {
  clearRepostCommentsCache,
  getCachedRepostComments,
  notifyRepostCommentsChanged,
  notifyRepostCommentsOptimistic,
  setCachedRepostComments,
} from '@/data/hooks/useRepostComments';
import { notifyRepostCommentLikesChanged } from '@/data/hooks/useRepostCommentLikes';
import { notifyRepostLikesChanged } from '@/data/hooks/useRepostLikes';
import { mapCommentDto } from '@/data/mappers/commentMapper';
import { useAuthStore } from './authStore';
import { useFactsStore } from './factsStore';
import { useUIStore } from './uiStore';

const client = createApiClient(getIdToken);

/** Serial counter for optimistic temporary ids (`temp-1`, `temp-2`, …). */
let tempId = 0;

function buildOptimisticComment(content: string, parentCommentId: string | null): Comment {
  const user = useAuthStore.getState().user;
  const author: CommentAuthor = {
    username: user?.username ?? 'unknown',
    displayName: user?.displayName ?? user?.username ?? 'unknown',
    avatarUrl: user?.avatarUrl ?? null,
    avatarColor: user?.avatarColor ?? null,
  };
  const now = new Date().toISOString();
  return {
    id: `temp-${++tempId}`,
    content,
    author,
    parentCommentId,
    createdAt: now,
    updatedAt: now,
    edited: false,
    replies: [],
  };
}

function mapComment(
  list: Comment[],
  commentId: string,
  update: (comment: Comment) => Comment,
): Comment[] {
  return list.map((comment) => {
    if (comment.id === commentId) return update(comment);
    if (comment.replies?.some((reply) => reply.id === commentId)) {
      return {
        ...comment,
        replies: comment.replies.map((reply) =>
          reply.id === commentId ? update(reply) : reply,
        ),
      };
    }
    return comment;
  });
}

function removeComment(list: Comment[], commentId: string): Comment[] {
  return list
    .filter((comment) => comment.id !== commentId)
    .map((comment) =>
      comment.replies?.some((reply) => reply.id === commentId)
        ? { ...comment, replies: comment.replies.filter((reply) => reply.id !== commentId) }
        : comment,
    );
}

function insertReply(list: Comment[], parentId: string, reply: Comment): Comment[] {
  return list.map((comment) =>
    comment.id === parentId
      ? {
          ...comment,
          replies: [...(comment.replies ?? []), reply].sort((a, b) =>
            a.createdAt.localeCompare(b.createdAt),
          ),
        }
      : comment,
  );
}

/**
 * Updates the repost's counts on the Fact in factsStore so the feed card
 * reflects the change immediately.
 */
function applyRepostFactUpdate(
  repostEntryId: string,
  patch: Partial<Pick<Fact, 'repostLikeCount' | 'repostLiked' | 'repostCommentCount'>>,
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
  toggleRepostLike: (repostEntryId: string) => Promise<void>;
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
export const useRepostsStore = create<RepostsState>(() => ({
  toggleRepostLike: async (repostEntryId: string) => {
    const fact = useFactsStore.getState().facts.find((f) => f.id === repostEntryId);
    if (!fact) return;

    const wasLiked = fact.repostLiked;
    const currentUser = useAuthStore.getState().user;

    const { snapFacts, snapUserFacts } = applyRepostFactUpdate(repostEntryId, {
      repostLiked: !wasLiked,
      repostLikeCount: fact.repostLikeCount + (wasLiked ? -1 : 1),
    });

    try {
      if (wasLiked) {
        await client.del(`/reposts/${repostEntryId}/likes`);
      } else {
        await client.post(`/reposts/${repostEntryId}/likes`);
      }
      notifyRepostLikesChanged(repostEntryId);
    } catch (error) {
      rollbackRepostFact(snapFacts, snapUserFacts);
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as AppError);
      }
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
    const { snapFacts, snapUserFacts } = applyRepostFactUpdate(repostEntryId, {
      repostCommentCount: (useFactsStore.getState().facts.find((f) => f.id === repostEntryId)?.repostCommentCount ?? 0) + 1,
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
    }
  },

  deleteRepostComment: async (repostEntryId, commentId) => {
    const snapshot = getCachedRepostComments(repostEntryId);
    setCachedRepostComments(repostEntryId, removeComment(snapshot, commentId));
    notifyRepostCommentsChanged(repostEntryId);

    // Decrement repostCommentCount on the Fact optimistically.
    const { snapFacts, snapUserFacts } = applyRepostFactUpdate(repostEntryId, {
      repostCommentCount: Math.max(0, (useFactsStore.getState().facts.find((f) => f.id === repostEntryId)?.repostCommentCount ?? 1) - 1),
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
