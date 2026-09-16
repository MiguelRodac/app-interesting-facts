import type { Fact } from '@/types';

/**
 * Which entries a patch may touch:
 * - 'fact'         → the plain-fact surface of one fact (never repost cards).
 * - 'repost-entry' → exactly one repost card's own surface (its own likes).
 * - 'repost-tree'  → an original fact AND every repost entry referencing it
 *                    (repost toggles must stay in sync across all forms).
 */
export type EntryUpdateScope = 'fact' | 'repost-entry' | 'repost-tree';

/** Optimistically-updatable Fact fields shared by stores and lists. */
export type EntryPatch = Partial<
  Pick<
    Fact,
    | 'liked'
    | 'likesCount'
    | 'likeBy'
    | 'repostedByMe'
    | 'repostCount'
    | 'repostBy'
    | 'repostLiked'
    | 'repostLikeCount'
    | 'repostCommentCount'
  >
>;

export interface EntryAnchor {
  id: string;
  originalFactId?: string;
}

type Listener = (scope: EntryUpdateScope, anchor: EntryAnchor, patch: EntryPatch) => void;

const listeners = new Set<Listener>();

/** Stores broadcast here after computing an optimistic patch (and on rollback). */
export function broadcastEntryUpdate(scope: EntryUpdateScope, anchor: EntryAnchor, patch: EntryPatch): void {
  listeners.forEach((listener) => listener(scope, anchor, patch));
}

/** Lists subscribe on mount; returns the unsubscribe function. */
export function subscribeEntryUpdates(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Applies a broadcast patch to a local list. Matching is scope-aware:
 * like surfaces never bleed between facts and reposts even though they
 * share field names (likeBy carries whichever surface owns the card).
 */
export function applyEntryUpdate<T extends Fact>(
  list: T[],
  scope: EntryUpdateScope,
  anchor: EntryAnchor,
  patch: EntryPatch,
): T[] {
  const matches = (f: Fact): boolean => {
    switch (scope) {
      case 'fact':
        return !f.isRepost && (f.id === anchor.id || f.id === anchor.originalFactId);
      case 'repost-entry':
        return f.isRepost === true && f.id === anchor.id;
      case 'repost-tree': {
        const treeId = anchor.originalFactId ?? anchor.id;
        return f.id === treeId || f.originalFactId === treeId;
      }
    }
  };
  return list.map((f) => (matches(f) ? { ...f, ...patch } : f));
}
