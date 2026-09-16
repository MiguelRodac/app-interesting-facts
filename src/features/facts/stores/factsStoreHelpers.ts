import type { Author, Fact, FactLike } from '@/types';

/**
 * Inserts a fact into a list keeping createdAt-desc order, or replaces it
 * if it already exists. Used when opening a fact detail by ID so the fact
 * joins the feed cache coherently (likes/delete/edit keep working).
 */
export function upsertFact(list: Fact[], fact: Fact): Fact[] {
  const exists = list.some((f) => f.id === fact.id);
  if (!exists) {
    return [...list, fact].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return list.map((f) => (f.id === fact.id ? fact : f));
}

/**
 * Merges a fresh page 1 into the existing list: newer items get added on
 * top and existing ones get updated, so a background refresh brings new
 * facts without resetting the feed/scroll position.
 */
export function mergeFacts(current: Fact[], fresh: Fact[]): Fact[] {
  const byId = new Map(current.map((f) => [f.id, f]));
  for (const fact of fresh) byId.set(fact.id, fact);
  return Array.from(byId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Builds the optimistic liked-by list for the current user's like/unlike.
 * On like the user is prepended (most recent liker first) and the list is
 * capped at 3 — the number shown by LikedByLine. On unlike their row is
 * dropped. The backend reconcile that follows the API call corrects drift.
 */
export function optimisticLikeBy(likeBy: FactLike[], user: Author, liked: boolean): FactLike[] {
  const withoutUser = likeBy.filter((l) => l.username !== user.username);
  if (!liked) return withoutUser;
  const entry: FactLike = {
    username: user.username,
    avatarUrl: user.avatarUrl,
    avatarColor: user.avatarColor,
  };
  return [entry, ...withoutUser].slice(0, 3);
}

/**
 * Builds the optimistic reposted-by list for the current user's repost/
 * un-repost. Same shape and policy as optimisticLikeBy: the user is
 * prepended (most recent reposter first) capped at 3 on repost, removed on
 * un-repost. The backend reconcile that follows the API call corrects drift.
 */
export function optimisticRepostBy(repostBy: FactLike[], user: Author, reposted: boolean): FactLike[] {
  const withoutUser = repostBy.filter((r) => r.username !== user.username);
  if (!reposted) return withoutUser;
  const entry: FactLike = {
    username: user.username,
    avatarUrl: user.avatarUrl,
    avatarColor: user.avatarColor,
  };
  return [entry, ...withoutUser].slice(0, 3);
}
