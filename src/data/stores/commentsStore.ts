import { create } from 'zustand';
import type { AppError, Comment, CommentAuthor } from '@/types';
import { createApiClient } from '@/data/api/client';
import type { ApiComment } from '@/data/api/types';
import { getIdToken } from '@/data/auth/firebaseAuth';
import {
  clearCommentsCache,
  getCachedComments,
  notifyFactCommentsChanged,
  notifyCommentsOptimistic,
  setCachedComments,
} from '@/data/hooks/useFactComments';
import { notifyCommentLikesChanged } from '@/data/hooks/useCommentLikes';
import { mapCommentDto } from '@/data/mappers/commentMapper';
import { useAuthStore } from './authStore';
import { useUIStore } from './uiStore';

const client = createApiClient(getIdToken);

/** Serial counter for optimistic temporary ids (`temp-1`, `temp-2`, …). */
let tempId = 0;

/**
 * Builds the optimistic comment as the current user. Display name falls back
 * to the username and avatar fields to null, matching CommentAuthor.
 */
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

/** Maps a comment by id, looking through top-level entries and nested replies. */
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

/** Removes a comment by id from the top level or from its parent's replies. */
function removeComment(list: Comment[], commentId: string): Comment[] {
  return list
    .filter((comment) => comment.id !== commentId)
    .map((comment) =>
      comment.replies?.some((reply) => reply.id === commentId)
        ? { ...comment, replies: comment.replies.filter((reply) => reply.id !== commentId) }
        : comment,
    );
}

/** Appends a reply to its parent keeping createdAt-asc order (conversation flow). */
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

interface CommentsState {
  addComment: (factId: string, content: string, parentCommentId?: string | null) => Promise<void>;
  updateComment: (factId: string, commentId: string, content: string) => Promise<void>;
  deleteComment: (factId: string, commentId: string) => Promise<void>;
  toggleCommentLike: (factId: string, comment: Comment) => Promise<void>;
  reset: () => void;
}

/**
 * Write-side of the comments module. Holds no per-fact state: the hook's
 * module cache is the single source of truth, so every mutation snapshots
 * the cache, applies an optimistic change, pings the hooks to refetch, and
 * rolls the snapshot back on error (same pattern as factsStore.toggleLike).
 * Each success path ends with notifyFactCommentsChanged so the final refetch
 * reconciles the cache with the backend's authoritative thread.
 */
export const useCommentsStore = create<CommentsState>(() => ({
  addComment: async (factId, content, parentCommentId) => {
    const snapshot = getCachedComments(factId);
    const temp = buildOptimisticComment(content, parentCommentId ?? null);
    // Top-level comments stay newest-first; replies nest under their parent.
    const optimistic = parentCommentId
      ? insertReply(snapshot, parentCommentId, temp)
      : [temp, ...snapshot];
    setCachedComments(factId, optimistic);
    notifyFactCommentsChanged(factId);

    try {
      const created = mapCommentDto(
        await client.post<ApiComment>(`/facts/${factId}/comments`, {
          content,
          ...(parentCommentId ? { parentCommentId } : {}),
        }),
      );
      // Replace the temp entry with the server comment; if a refetch already
      // swapped it out, the second notify below reconciles to server truth.
      setCachedComments(factId, mapComment(getCachedComments(factId), temp.id, () => created));
      notifyFactCommentsChanged(factId);
    } catch (error) {
      setCachedComments(factId, snapshot);
      notifyFactCommentsChanged(factId);
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as AppError);
      }
    }
  },

  updateComment: async (factId, commentId, content) => {
    const snapshot = getCachedComments(factId);
    const optimistic = { content, edited: true, updatedAt: new Date().toISOString() };
    setCachedComments(
      factId,
      mapComment(snapshot, commentId, (comment) => ({ ...comment, ...optimistic })),
    );
    notifyFactCommentsChanged(factId);

    try {
      const updated = mapCommentDto(
        await client.patch<ApiComment>(`/comments/${commentId}`, { content }),
      );
      setCachedComments(
        factId,
        mapComment(getCachedComments(factId), commentId, () => updated),
      );
      notifyFactCommentsChanged(factId);
    } catch (error) {
      setCachedComments(factId, snapshot);
      notifyFactCommentsChanged(factId);
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as AppError);
      }
    }
  },

  deleteComment: async (factId, commentId) => {
    const snapshot = getCachedComments(factId);
    setCachedComments(factId, removeComment(snapshot, commentId));
    notifyFactCommentsChanged(factId);

    try {
      await client.del(`/comments/${commentId}`);
      // Re-remove (a racing refetch may have repopulated the entry) and
      // notify again so the final refetch confirms the deletion.
      setCachedComments(factId, removeComment(getCachedComments(factId), commentId));
      notifyFactCommentsChanged(factId);
    } catch (error) {
      setCachedComments(factId, snapshot);
      notifyFactCommentsChanged(factId);
      if (error && typeof error === 'object' && 'code' in error) {
        // The mapped AppError already carries the specific
        // DELETE_BLOCKED_HAS_REPLIES user message for 403s.
        useUIStore.getState().setError(error as AppError);
      }
    }
  },

  toggleCommentLike: async (factId, comment) => {
    const snapshot = getCachedComments(factId);
    const likeComment = (c: Comment): Comment =>
      c.id === comment.id
        ? {
            ...c,
            liked: !comment.liked,
            likesCount: (c.likesCount ?? 0) + (comment.liked ? -1 : 1),
          }
        : c;

    // Optimistic flip of liked + count — lightweight notify (no refetch).
    setCachedComments(
      factId,
      mapComment(snapshot, comment.id, likeComment),
    );
    notifyCommentsOptimistic(factId);

    try {
      if (comment.liked) {
        await client.del(`/facts/${factId}/comments/${comment.id}/likes`);
      } else {
        await client.post(`/facts/${factId}/comments/${comment.id}/likes`);
      }
      // Success — the optimistic liked/count flip is authoritative; leave it
      // in place. Also invalidate the comment-likes modal cache so the list
      // refetches when the user opens it again.
      notifyCommentLikesChanged(factId, comment.id);
    } catch (error) {
      setCachedComments(factId, snapshot);
      notifyFactCommentsChanged(factId);
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as AppError);
      }
    }
  },

  reset: () => {
    // No per-fact state to clear — the hook's module cache is what we own.
    clearCommentsCache();
  },
}));