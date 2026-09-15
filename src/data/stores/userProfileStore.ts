import { create } from 'zustand';

import type { Fact, PublicProfile } from '@/types';
import { createApiClient } from '../api/client';
import type { ApiAuthor, ApiFactFeedItem, ApiCursorPaginatedResponse } from '../api/types';
import { getIdToken } from '../auth/firebaseAuth';
import { mapFactsDtos } from '../mappers/factMapper';
import { mapAuthorDto } from '../mappers/userMapper';
import { applyEntryUpdate, subscribeEntryUpdates } from '../hooks/entryUpdateBus';
import { useFactsStore, type ToggleRepostResult } from './factsStore';
import { useUIStore } from './uiStore';

const client = createApiClient(getIdToken);

interface UserProfileState {
  profile: PublicProfile | null;
  facts: Fact[];
  isLoading: boolean;
  factsLoading: boolean;
  factsLoadingMore: boolean;
  factsPage: number;
  factsHasMore: boolean;
  factsNextCursor: string | null;
  fetchProfile: (username: string, silent?: boolean) => Promise<void>;
  fetchUserFacts: (authorId: string, silent?: boolean) => Promise<void>;
  loadMoreUserFacts: (authorId: string) => Promise<void>;
  toggleLike: (factId: string, fallbackFact?: Fact) => Promise<void>;
  toggleRepost: (factId: string, fallbackFact?: Fact) => Promise<ToggleRepostResult>;
  clearProfile: () => void;
}

export const useUserProfileStore = create<UserProfileState>((set, get) => ({
  profile: null,
  facts: [],
  isLoading: false,
  factsLoading: false,
  factsLoadingMore: false,
  factsPage: 1,
  factsHasMore: false,
  factsNextCursor: null,

  fetchProfile: async (username: string, silent?: boolean) => {
    // Silent refresh keeps the current profile visible while updating it
    if (!silent) set({ isLoading: true, profile: null });
    try {
      const data = await client.get<ApiAuthor>(`/users/${username}`);
      const profile: PublicProfile = {
        ...mapAuthorDto(data),
        createdAt: data.createdAt ?? new Date().toISOString(),
      };
      set({ profile, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      if (silent) return;
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
      throw error;
    }
  },

  fetchUserFacts: async (authorId: string, silent?: boolean) => {
    // Silent refresh keeps the current list while updating it
    if (get().factsLoading) return;
    if (!silent) set({ factsLoading: true, facts: [] });
    try {
      const response = await client.get<ApiCursorPaginatedResponse<ApiFactFeedItem>>(
        `/facts/author/${authorId}`,
        {
          limit: '50',
        },
      );
      const raw = response?.results ?? [];
      const nextCursor = response?.nextCursor ?? null;
      const hasMore = Boolean(response?.hasMore && nextCursor !== null);
      const facts = mapFactsDtos(raw);
      const sorted = [...facts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      set({
        facts: sorted,
        factsPage: 1,
        factsNextCursor: nextCursor,
        factsHasMore: hasMore,
        factsLoading: false,
      });
    } catch (error) {
      if (!silent) set({ factsLoading: false, facts: [] });
      if (silent) return;
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
    }
  },

  loadMoreUserFacts: async (authorId: string) => {
    const { factsLoading, factsLoadingMore, factsHasMore, factsNextCursor, facts } = get();
    if (factsLoading || factsLoadingMore || !factsHasMore || !factsNextCursor || facts.length === 0) return;
    set({ factsLoadingMore: true });
    try {
      const response = await client.get<ApiCursorPaginatedResponse<ApiFactFeedItem>>(
        `/facts/author/${authorId}`,
        {
          cursor: factsNextCursor,
          limit: '50',
        },
      );
      const raw = response?.results ?? [];
      const newNextCursor = response?.nextCursor ?? null;
      const newHasMore = Boolean(response?.hasMore && newNextCursor !== null);
      const incoming = mapFactsDtos(raw);
      const byId = new Map(facts.map((f) => [f.id, f]));
      for (const item of incoming) {
        byId.set(item.id, item);
      }
      const merged = Array.from(byId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      set({
        facts: merged,
        factsNextCursor: newNextCursor,
        factsHasMore: newHasMore,
        factsLoadingMore: false,
      });
    } catch (error) {
      set({ factsLoadingMore: false });
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
    }
  },

  toggleLike: async (factId: string, fallbackFact?: Fact) => {
    const { facts } = get();
    const fact = facts.find((f) => f.id === factId) ?? fallbackFact;
    await useFactsStore.getState().toggleLike(factId, fact);
  },

  toggleRepost: async (factId: string, fallbackFact?: Fact): Promise<ToggleRepostResult> => {
    const { facts } = get();
    const fact = facts.find((f) => f.id === factId || f.originalFactId === factId) ?? fallbackFact;
    return useFactsStore.getState().toggleRepost(factId, fact);
  },

  clearProfile: () => {
    set({
      profile: null,
      facts: [],
      factsPage: 1,
      factsNextCursor: null,
      factsHasMore: false,
      factsLoadingMore: false,
    });
  },
}));

// Synchronize userProfileStore with global entry update bus (likes, reposts, repost-likes)
subscribeEntryUpdates((scope, anchor, patch) => {
  const current = useUserProfileStore.getState().facts;
  if (current.length === 0) return;
  const updated = applyEntryUpdate(current, scope, anchor, patch);
  if (updated !== current) {
    useUserProfileStore.setState({ facts: updated });
  }
});
