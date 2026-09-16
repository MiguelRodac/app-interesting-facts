import { create } from 'zustand';
import type { Fact } from '@/types';
import { createApiClient } from '@/shared/api/client';
import type { ApiFact, ApiFactFeedItem, ApiCursorPaginatedResponse, ApiRepostResponse } from '@/shared/api/types';
import { mapFactsDtos, mapFactDto, mapRepostDto } from '@/features/facts/mappers/factMapper';
import { getIdToken } from '@/features/auth/services/firebaseAuth';
import { notifyFactLikesChanged } from '../hooks/useFactLikes';
import { broadcastEntryUpdate } from '@/shared/events/entryUpdateBus';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useUIStore } from '@/shared/stores/uiStore';
import { registerOnLogout } from '@/features/auth/services/logoutRegistry';
import {
  upsertFact,
  mergeFacts,
  optimisticLikeBy,
  optimisticRepostBy,
} from './factsStoreHelpers';

const PAGE_SIZE = 20;
const PROFILE_PAGE_SIZE = 50;

const client = createApiClient(getIdToken);

export interface ToggleRepostResult {
  success: boolean;
  reposted: boolean;
}

interface FactsState {
  facts: Fact[];
  userFacts: Fact[];
  isLoading: boolean;
  userFactsLoading: boolean;
  userFactsLoadingMore: boolean;
  page: number;
  hasMore: boolean;
  nextCursor: string | null;
  userFactsPage: number;
  userFactsHasMore: boolean;
  userFactsNextCursor: string | null;
  fetchFacts: (silent?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  fetchFactById: (factId: string) => Promise<Fact>;
  fetchRepostById: (repostId: string) => Promise<Fact>;
  fetchUserFacts: (userId: string, silent?: boolean) => Promise<void>;
  loadMoreUserFacts: (userId: string) => Promise<void>;
  toggleLike: (factId: string, fallbackFact?: Fact) => Promise<void>;
  toggleRepost: (factId: string, fallbackFact?: Fact) => Promise<ToggleRepostResult>;
  addFact: (fact: { title?: string; content: string }) => Promise<Fact>;
  updateFact: (factId: string, data: { title?: string; content?: string }) => Promise<Fact>;
  deleteFact: (factId: string) => Promise<void>;
  reset: () => void;
}

// Runtime cache of deleted fact IDs to prevent zombie refetches across the app
const deletedFactIds = new Set<string>();

const likesInFlight = new Set<string>();

export const useFactsStore = create<FactsState>((set, get) => ({
  facts: [],
  userFacts: [],
  isLoading: false,
  userFactsLoading: false,
  userFactsLoadingMore: false,
  page: 1,
  hasMore: true,
  nextCursor: null,
  userFactsPage: 1,
  userFactsHasMore: false,
  userFactsNextCursor: null,

  fetchFacts: async (silent?: boolean) => {
    // Anonymous "view mode": cap the feed at 5 and never paginate. Signed-in
    // viewers get the full PAGE_SIZE (20) with pagination.
    const isAnon = !useAuthStore.getState().user;
    if (!silent) set({ isLoading: true });
    try {
      const response = await client.get<ApiCursorPaginatedResponse<ApiFactFeedItem>>(
        '/facts',
        {
          limit: String(isAnon ? 5 : PAGE_SIZE),
        },
      );
      const results = response?.results ?? [];
      const nextCursor = response?.nextCursor ?? null;
      const hasMore = Boolean(response?.hasMore && nextCursor !== null);
      const fetched = mapFactsDtos(results);
      // Always sort descending (newest first) regardless of backend order.
      const sorted = [...fetched].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      if (isAnon) {
        set({ facts: sorted.slice(0, 5), page: 1, nextCursor: null, hasMore: false, isLoading: false });
      } else if (silent) {
        // Background refresh: merge so new facts appear on top, existing
        // ones get fresh data, and the scroll position is preserved.
        set((state) => ({
          facts: mergeFacts(state.facts, fetched),
          page: 1,
          nextCursor: state.nextCursor ?? nextCursor,
          hasMore: state.nextCursor ? state.hasMore : hasMore,
        }));
      } else {
        set({ facts: sorted, page: 1, nextCursor, hasMore, isLoading: false });
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
    const { isLoading, hasMore, nextCursor, facts } = get();
    if (isLoading || !hasMore || !nextCursor) return;

    set({ isLoading: true });
    try {
      const response = await client.get<ApiCursorPaginatedResponse<ApiFactFeedItem>>(
        '/facts',
        { cursor: nextCursor, limit: String(PAGE_SIZE) },
      );
      const results = response?.results ?? [];
      const newNextCursor = response?.nextCursor ?? null;
      const newHasMore = Boolean(response?.hasMore && newNextCursor !== null);
      const newFacts = mapFactsDtos(results);
      const merged = mergeFacts(facts, newFacts);
      set({
        facts: merged,
        nextCursor: newNextCursor,
        hasMore: newHasMore,
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
    if (deletedFactIds.has(factId)) {
      throw new Error(`Fact ${factId} has been deleted`);
    }
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

  fetchRepostById: async (repostId: string) => {
    try {
      const dto = await client.get<ApiRepostResponse>(`/reposts/${repostId}`);
      const fact = mapRepostDto(dto);
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
    // Silent refresh skips the loading state and error banner (background refresh),
    if (get().userFactsLoading) return;
    if (!silent || get().userFacts.length === 0) set({ userFactsLoading: true });
    try {
      const response = await client.get<ApiCursorPaginatedResponse<ApiFactFeedItem>>(
        `/facts/author/${userId}`,
        {
          limit: String(PROFILE_PAGE_SIZE),
        },
      );
      const results = response?.results ?? [];
      const nextCursor = response?.nextCursor ?? null;
      const hasMore = Boolean(response?.hasMore && nextCursor !== null);
      const userFacts = mapFactsDtos(results);
      const sorted = [...userFacts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      if (silent) {
        set((state) => ({
          userFacts: mergeFacts(state.userFacts, userFacts),
          userFactsPage: 1,
          userFactsNextCursor: state.userFactsNextCursor ?? nextCursor,
          userFactsHasMore: state.userFactsNextCursor ? state.userFactsHasMore : hasMore,
          userFactsLoading: false,
        }));
      } else {
        set({
          userFacts: sorted,
          userFactsPage: 1,
          userFactsNextCursor: nextCursor,
          userFactsHasMore: hasMore,
          userFactsLoading: false,
        });
      }
    } catch (error) {
      set({ userFactsLoading: false });
      if (silent) return;
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
    }
  },

  loadMoreUserFacts: async (userId: string) => {
    const { userFactsLoading, userFactsLoadingMore, userFactsHasMore, userFactsNextCursor, userFacts } = get();
    if (userFactsLoading || userFactsLoadingMore || !userFactsHasMore || !userFactsNextCursor || userFacts.length === 0) return;
    set({ userFactsLoadingMore: true });
    try {
      const response = await client.get<ApiCursorPaginatedResponse<ApiFactFeedItem>>(
        `/facts/author/${userId}`,
        {
          cursor: userFactsNextCursor,
          limit: String(PROFILE_PAGE_SIZE),
        },
      );
      const results = response?.results ?? [];
      const newNextCursor = response?.nextCursor ?? null;
      const newHasMore = Boolean(response?.hasMore && newNextCursor !== null);
      const incoming = mapFactsDtos(results);
      const byId = new Map(userFacts.map((f) => [f.id, f]));
      for (const item of incoming) {
        if (!deletedFactIds.has(item.id)) {
          byId.set(item.id, item);
        }
      }
      const merged = Array.from(byId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      set({
        userFacts: merged,
        userFactsNextCursor: newNextCursor,
        userFactsHasMore: newHasMore,
        userFactsLoadingMore: false,
      });
    } catch (error) {
      set({ userFactsLoadingMore: false });
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
    }
  },

  toggleLike: async (factId: string, fallbackFact?: Fact) => {
    const { facts, userFacts } = get();
    // The entry may live in the feed cache, the user-facts list, or nowhere
    // locally (profile Liked/Mentions tabs render remote-only posts) — the
    // caller supplies the rendered card as fallback in that case.
    const fact =
      facts.find((f) => f.id === factId) ??
      userFacts.find((f) => f.id === factId) ??
      fallbackFact;
    if (!fact) return;

    // Reposts have composite IDs — use the original fact ID for API calls.
    const apiFactId = fact.originalFactId ?? factId;
    if (likesInFlight.has(apiFactId)) {
      return;
    }
    likesInFlight.add(apiFactId);

    const wasLiked = fact.liked;
    const currentUser = useAuthStore.getState().user;
    const anchor = { id: fact.id, originalFactId: fact.originalFactId };

    // Optimistic update — keep feed and user facts in sync, including the
    // liked-by line (mini avatars + usernames) so it feels instant.
    const likePatch = {
      liked: !wasLiked,
      likesCount: fact.likesCount + (wasLiked ? -1 : 1),
      likeBy: currentUser ? optimisticLikeBy(fact.likeBy, currentUser, !wasLiked) : fact.likeBy,
    };
    const applyOptimistic = (f: Fact): Fact => (f.id === factId ? { ...f, ...likePatch } : f);

    set({ facts: facts.map(applyOptimistic), userFacts: userFacts.map(applyOptimistic) });
    broadcastEntryUpdate('fact', anchor, likePatch);

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
        broadcastEntryUpdate('fact', anchor, {
          liked: fresh.liked,
          likesCount: fresh.likesCount,
          likeBy: fresh.likeBy,
        });
      } catch {
        // keep optimistic state
      }

      // Live-update "Liked by …" lines across every mounted screen
      notifyFactLikesChanged(apiFactId);
    } catch (error) {
      // Rollback on error — restores the pre-optimistic snapshots, which
      // also reverts this action's likeBy change.
      set({ facts, userFacts });
      broadcastEntryUpdate('fact', anchor, {
        liked: wasLiked,
        likesCount: fact.likesCount,
        likeBy: fact.likeBy,
      });
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
    } finally {
      likesInFlight.delete(apiFactId);
    }
  },

  toggleRepost: async (originalFactId: string, fallbackFact?: Fact): Promise<ToggleRepostResult> => {
    const { facts, userFacts } = get();
    // Find the fact to read current state — could be the original fact entry
    // or a repost entry that references it, in the feed, in user facts, or
    // only on the caller's rendered card (Liked/Mentions tabs).
    const findEntry = (list: Fact[]) =>
      list.find((f) => f.id === originalFactId || f.originalFactId === originalFactId);
    const fact = findEntry(facts) ?? findEntry(userFacts) ?? fallbackFact;
    if (!fact) return { success: false, reposted: false };

    const wasReposted = fact.repostedByMe;
    const nowReposted = !wasReposted;
    const currentUser = useAuthStore.getState().user;

    // Matches any entry that IS the original fact or references it as a repost.
    const matches = (f: Fact) =>
      f.id === originalFactId || f.originalFactId === originalFactId;

    // Optimistic update — sync all related entries across feed + user facts.
    const repostPatch = {
      repostedByMe: nowReposted,
      repostCount: fact.repostCount + (wasReposted ? -1 : 1),
      repostBy: currentUser
        ? optimisticRepostBy(fact.repostBy, currentUser, nowReposted)
        : fact.repostBy,
    };
    const applyOptimistic = (f: Fact): Fact => (matches(f) ? { ...f, ...repostPatch } : f);

    set({ facts: facts.map(applyOptimistic), userFacts: userFacts.map(applyOptimistic) });
    broadcastEntryUpdate('repost-tree', { id: originalFactId }, repostPatch);

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
        broadcastEntryUpdate('repost-tree', { id: originalFactId }, {
          repostBy: fresh.repostBy,
          repostCount: fresh.repostCount,
        });
      } catch {
        // keep optimistic state
      }
      return { success: true, reposted: nowReposted };
    } catch (error) {
      set({ facts, userFacts });
      broadcastEntryUpdate('repost-tree', { id: originalFactId }, {
        repostedByMe: wasReposted,
        repostCount: fact.repostCount,
        repostBy: fact.repostBy,
      });
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
      return { success: false, reposted: wasReposted };
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
    deletedFactIds.add(factId);
    try {
      await client.del(`/facts/${factId}`);
      set((state) => ({
        facts: state.facts.filter((f) => f.id !== factId),
        userFacts: state.userFacts.filter((f) => f.id !== factId),
      }));
    } catch (error) {
      deletedFactIds.delete(factId);
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
      throw error;
    }
  },

  reset: () => {
    deletedFactIds.clear();
    set({
      facts: [],
      userFacts: [],
      page: 1,
      hasMore: true,
      nextCursor: null,
      userFactsPage: 1,
      userFactsHasMore: false,
      userFactsNextCursor: null,
      isLoading: false,
      userFactsLoading: false,
      userFactsLoadingMore: false,
    });
  },
}));

registerOnLogout(() => useFactsStore.getState().reset());
