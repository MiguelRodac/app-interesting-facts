import { create } from 'zustand';
import type { Author, Fact, FactLike } from '@/types';
import { createApiClient } from '../api/client';
import type { ApiFact, ApiFactFeedItem, ApiPaginatedResponse } from '../api/types';
import { mapFactsDtos, mapFactDto } from '../mappers/factMapper';
import { getIdToken } from '../auth/firebaseAuth';
import { notifyFactLikesChanged } from '../hooks/useFactLikes';
import { useAuthStore } from './authStore';
import { useUIStore } from './uiStore';

const PAGE_SIZE = 20;

const client = createApiClient(getIdToken);

/**
 * Inserts a fact into a list keeping createdAt-desc order, or replaces it
 * if it already exists. Used when opening a fact detail by ID so the fact
 * joins the feed cache coherently (likes/delete/edit keep working).
 */
function upsertFact(list: Fact[], fact: Fact): Fact[] {
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
function mergeFacts(current: Fact[], fresh: Fact[]): Fact[] {
  const byId = new Map(current.map((f) => [f.id, f]));
  for (const fact of fresh) byId.set(fact.id, fact);
  return Array.from(byId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Builds the optimistic liked-by list for the current user's like/unlike.
 * On like the user is prepended (most recent liker first) and the list is
 * capped at 2 — the number shown by LikedByLine. On unlike their row is
 * dropped. The backend reconcile that follows the API call corrects drift.
 */
function optimisticLikeBy(likeBy: FactLike[], user: Author, liked: boolean): FactLike[] {
  const withoutUser = likeBy.filter((l) => l.username !== user.username);
  if (!liked) return withoutUser;
  const entry: FactLike = {
    username: user.username,
    avatarUrl: user.avatarUrl,
    avatarColor: user.avatarColor,
  };
  return [entry, ...withoutUser].slice(0, 2);
}

/**
 * Builds the optimistic reposted-by list for the current user's repost/
 * un-repost. Same shape and policy as optimisticLikeBy: the user is
 * prepended (most recent reposter first) capped at 2 on repost, removed on
 * un-repost. The backend reconcile that follows the API call corrects drift.
 */
function optimisticRepostBy(repostBy: FactLike[], user: Author, reposted: boolean): FactLike[] {
  const withoutUser = repostBy.filter((r) => r.username !== user.username);
  if (!reposted) return withoutUser;
  const entry: FactLike = {
    username: user.username,
    avatarUrl: user.avatarUrl,
    avatarColor: user.avatarColor,
  };
  return [entry, ...withoutUser].slice(0, 2);
}

interface FactsState {
  facts: Fact[];
  userFacts: Fact[];
  isLoading: boolean;
  userFactsLoading: boolean;
  page: number;
  hasMore: boolean;
  fetchFacts: (silent?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  fetchFactById: (factId: string) => Promise<Fact>;
  fetchUserFacts: (userId: string, silent?: boolean) => Promise<void>;
  toggleLike: (factId: string) => Promise<void>;
  toggleRepost: (factId: string) => Promise<boolean>;
  addFact: (fact: { title?: string; content: string }) => Promise<Fact>;
  updateFact: (factId: string, data: { title?: string; content?: string }) => Promise<Fact>;
  deleteFact: (factId: string) => Promise<void>;
  reset: () => void;
}

export const useFactsStore = create<FactsState>((set, get) => ({
  facts: [],
  userFacts: [],
  isLoading: false,
  userFactsLoading: false,
  page: 1,
  hasMore: true,

  fetchFacts: async (silent?: boolean) => {
    // Anonymous "view mode": cap the feed at 5 and never paginate. Signed-in
    // viewers get the full PAGE_SIZE (20) with pagination.
    const isAnon = !useAuthStore.getState().user;
    if (!silent) set({ isLoading: true });
    try {
      const { results, nextPage } = await client.get<ApiPaginatedResponse<ApiFactFeedItem>>(
        '/facts',
        {
          page: '1',
          limit: String(isAnon ? 5 : PAGE_SIZE),
          order_by: 'createdAt',
          order_dir: 'desc',
        },
      );
      const fetched = mapFactsDtos(results);
      // Always sort descending (newest first) regardless of backend order.
      const sorted = [...fetched].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      if (isAnon) {
        set({ facts: sorted.slice(0, 5), page: 1, hasMore: false, isLoading: false });
      } else if (silent) {
        // Background refresh: merge so new facts appear on top, existing
        // ones get fresh data, and the scroll position is preserved.
        set({ facts: mergeFacts(get().facts, fetched), hasMore: nextPage !== null });
      } else {
        set({ facts: sorted, page: 1, hasMore: nextPage !== null, isLoading: false });
      }
    } catch (error) {
      if (!silent) set({ isLoading: false });
      if (silent) return;
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
    }
  },

  loadMore: async () => {
    // Anonymous viewers never paginate — the feed is capped at 5.
    if (!useAuthStore.getState().user) return;
    const { isLoading, hasMore, page, facts } = get();
    if (isLoading || !hasMore) return;

    set({ isLoading: true });
    try {
      const nextPage = page + 1;
      const { results, nextPage: newNextPage } = await client.get<ApiPaginatedResponse<ApiFactFeedItem>>(
        '/facts',
        { page: String(nextPage), limit: String(PAGE_SIZE), order_by: 'createdAt', order_dir: 'desc' },
      );
      const newFacts = mapFactsDtos(results);
      const merged = mergeFacts(facts, newFacts);
      set({
        facts: merged,
        page: nextPage,
        hasMore: newNextPage !== null,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
    }
  },

  fetchFactById: async (factId: string) => {
    try {
      const dto = await client.get<ApiFact>(`/facts/${factId}`);
      const fact = mapFactDto(dto);
      set((state) => ({
        facts: upsertFact(state.facts, fact),
      }));
      return fact;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
      throw error;
    }
  },

  fetchUserFacts: async (userId: string, silent?: boolean) => {
    // Silent refresh skips the loading state and error banner (background refresh)
    if (!silent) set({ userFactsLoading: true });
    try {
      const { results } = await client.get<ApiPaginatedResponse<ApiFactFeedItem>>(
        `/facts/author/${userId}`,
        { page: '1', limit: String(PAGE_SIZE) },
      );
      const userFacts = mapFactsDtos(results);
      const sorted = [...userFacts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      set({ userFacts: sorted, userFactsLoading: false });
    } catch (error) {
      set({ userFactsLoading: false });
      if (silent) return;
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
    }
  },

  toggleLike: async (factId: string) => {
    const { facts, userFacts } = get();
    const fact = facts.find((f) => f.id === factId);
    if (!fact) return;

    // Reposts have composite IDs — use the original fact ID for API calls.
    const apiFactId = fact.originalFactId ?? factId;
    const wasLiked = fact.liked;
    const currentUser = useAuthStore.getState().user;

    // Optimistic update — keep feed and user facts in sync, including the
    // liked-by line (mini avatars + usernames) so it feels instant.
    const applyOptimistic = (f: Fact): Fact =>
      f.id === factId
        ? {
            ...f,
            liked: !wasLiked,
            likesCount: f.likesCount + (wasLiked ? -1 : 1),
            likeBy: currentUser
              ? optimisticLikeBy(f.likeBy, currentUser, !wasLiked)
              : f.likeBy,
          }
        : f;

    set({ facts: facts.map(applyOptimistic), userFacts: userFacts.map(applyOptimistic) });

    try {
      if (wasLiked) {
        await client.del(`/facts/${apiFactId}/likes`);
      } else {
        await client.post(`/facts/${apiFactId}/likes`);
      }

      // Reconcile with the backend's authoritative likeBy/commentsCount so
      // the "2 most recent likers" line matches reality after the rush.
      // On failure keep the optimistic state — the like/unlike succeeded.
      try {
        const fresh = await get().fetchFactById(apiFactId);
        set((state) => ({
          userFacts: state.userFacts.map((f) => (f.id === factId ? fresh : f)),
        }));
      } catch {
        // keep optimistic state
      }

      // Live-update "Liked by …" lines across every mounted screen
      notifyFactLikesChanged(apiFactId);
    } catch (error) {
      // Rollback on error — restores the pre-optimistic snapshots, which
      // also reverts this action's likeBy change.
      set({ facts, userFacts });
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
    }
  },

  toggleRepost: async (originalFactId: string): Promise<boolean> => {
    const { facts, userFacts } = get();
    // Find the fact to read current state — could be the original fact entry
    // or a repost entry that references it.
    const fact = facts.find(
      (f) => f.id === originalFactId || f.originalFactId === originalFactId,
    );
    if (!fact) return false;

    const wasReposted = fact.repostedByMe;
    const currentUser = useAuthStore.getState().user;

    // Matches any entry that IS the original fact or references it as a repost.
    const matches = (f: Fact) =>
      f.id === originalFactId || f.originalFactId === originalFactId;

    // Optimistic update — sync all related entries across feed + user facts.
    const applyOptimistic = (f: Fact): Fact =>
      matches(f)
        ? {
            ...f,
            repostedByMe: !wasReposted,
            repostCount: f.repostCount + (wasReposted ? -1 : 1),
            repostBy: currentUser
              ? optimisticRepostBy(f.repostBy, currentUser, !wasReposted)
              : f.repostBy,
          }
        : f;

    set({ facts: facts.map(applyOptimistic), userFacts: userFacts.map(applyOptimistic) });

    try {
      if (wasReposted) {
        await client.del(`/facts/${originalFactId}/reposts`);
      } else {
        await client.post(`/facts/${originalFactId}/reposts`);
      }

      // Reconcile with the backend's authoritative repostBy so the
      // "2 most recent reposters" state matches reality after the rush.
      try {
        const fresh = await get().fetchFactById(originalFactId);
        const reconcile = (f: Fact): Fact =>
          matches(f) ? { ...f, repostBy: fresh.repostBy, repostCount: fresh.repostCount } : f;
        set((state) => ({
          facts: state.facts.map(reconcile),
          userFacts: state.userFacts.map(reconcile),
        }));
      } catch {
        // keep optimistic state
      }
      return true;
    } catch (error) {
      set({ facts, userFacts });
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
      return false;
    }
  },

  addFact: async (data) => {
    try {
      const created = await client.post<ApiFact>('/facts', data);
      const fact = mapFactDto(created);
      const currentUserId = useAuthStore.getState().user?.id;
      set((state) => ({
        facts: [fact, ...state.facts],
        // If the author is the logged-in user, show it in "My Facts" right away
        ...(currentUserId && fact.author.id === currentUserId
          ? { userFacts: [fact, ...state.userFacts] }
          : {}),
      }));
      return fact;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
      throw error;
    }
  },

  updateFact: async (factId: string, data: { title?: string; content?: string }) => {
    try {
      const updated = await client.patch<ApiFact>(`/facts/${factId}`, data);
      const fact = mapFactDto(updated);
      set((state) => ({
        facts: state.facts.map((f) => (f.id === factId ? fact : f)),
        userFacts: state.userFacts.map((f) => (f.id === factId ? fact : f)),
      }));
      return fact;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
      throw error;
    }
  },

  deleteFact: async (factId: string) => {
    try {
      await client.del(`/facts/${factId}`);
      set((state) => ({
        facts: state.facts.filter((f) => f.id !== factId),
        userFacts: state.userFacts.filter((f) => f.id !== factId),
      }));
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
      throw error;
    }
  },

  reset: () => {
    set({
      facts: [],
      userFacts: [],
      page: 1,
      hasMore: true,
      isLoading: false,
      userFactsLoading: false,
    });
  },
}));
