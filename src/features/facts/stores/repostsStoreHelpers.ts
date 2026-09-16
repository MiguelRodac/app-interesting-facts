import type { Comment, CommentAuthor, Fact } from '@/types';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useFactsStore } from './factsStore';

/** Serial counter for optimistic temporary ids (`temp-1`, `temp-2`, …). */
let tempId = 0;

export function buildOptimisticComment(content: string, parentCommentId: string | null): Comment {
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

export function mapComment(
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

export function removeComment(list: Comment[], commentId: string): Comment[] {
  return list
    .filter((comment) => comment.id !== commentId)
    .map((comment) =>
      comment.replies?.some((reply) => reply.id === commentId)
        ? { ...comment, replies: comment.replies.filter((reply) => reply.id !== commentId) }
        : comment,
    );
}

export function insertReply(list: Comment[], parentId: string, reply: Comment): Comment[] {
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
 * Finds a repost entry by ID across the feed cache AND the user-facts list —
 * own-profile actions target entries that may only exist in userFacts.
 */
export function findRepostEntry(repostEntryId: string): Fact | undefined {
  const state = useFactsStore.getState();
  return (
    state.facts.find((f) => f.id === repostEntryId) ??
    state.userFacts.find((f) => f.id === repostEntryId)
  );
}
