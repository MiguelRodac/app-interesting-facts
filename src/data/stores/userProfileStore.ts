import { create } from 'zustand';

import type { Fact, PublicProfile } from '@/types';
import { createApiClient } from '../api/client';
import type { ApiAuthor, ApiFact, ApiPaginatedResponse } from '../api/types';
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
  fetchProfile: (username: string, silent?: boolean) => Promise<void>;
  fetchUserFacts: (authorId: string, silent?: boolean) => Promise<void>;
  toggleLike: (factId: string, fallbackFact?: Fact) => Promise<void>;
  toggleRepost: (factId: string, fallbackFact?: Fact) => Promise<ToggleRepostResult>;
  clearProfile: () => void;
}

export const useUserProfileStore = create<UserProfileState>((set, get) => ({
  profile: null,
  facts: [],
  isLoading: false,
  factsLoading: false,

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
    if (!silent) set({ factsLoading: true, facts: [] });
    try {
      const response = await client.get<ApiPaginatedResponse<ApiFact>>(
        `/facts/author/${authorId}`,
        { page: '1', limit: '20' },
      );
      const raw = response?.results ?? (Array.isArray(response) ? response : []);
      const facts = mapFactsDtos(raw as ApiFact[]);
      const sorted = [...facts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      set({ facts: sorted, factsLoading: false });
    } catch (error) {
      if (!silent) set({ factsLoading: false, facts: [] });
      if (silent) return;
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
    set({ profile: null, facts: [] });
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
