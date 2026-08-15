import { create } from 'zustand';

import type { Fact, PublicProfile } from '@/types';
import { createApiClient } from '../api/client';
import type { ApiAuthor, ApiFact, ApiPaginatedResponse } from '../api/types';
import { getIdToken } from '../auth/firebaseAuth';
import { mapFactsDtos } from '../mappers/factMapper';
import { mapAuthorDto } from '../mappers/userMapper';
import { useUIStore } from './uiStore';

const client = createApiClient(getIdToken);

interface UserProfileState {
  profile: PublicProfile | null;
  facts: Fact[];
  isLoading: boolean;
  factsLoading: boolean;
  fetchProfile: (username: string) => Promise<void>;
  fetchUserFacts: (authorId: string) => Promise<void>;
  clearProfile: () => void;
}

export const useUserProfileStore = create<UserProfileState>((set) => ({
  profile: null,
  facts: [],
  isLoading: false,
  factsLoading: false,

  fetchProfile: async (username: string) => {
    set({ isLoading: true, profile: null });
    try {
      const data = await client.get<ApiAuthor>(`/users/${username}`);
      const profile: PublicProfile = {
        ...mapAuthorDto(data),
        createdAt: data.createdAt ?? new Date().toISOString(),
      };
      set({ profile, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
      throw error;
    }
  },

  fetchUserFacts: async (authorId: string) => {
    set({ factsLoading: true, facts: [] });
    try {
      const response = await client.get<ApiPaginatedResponse<ApiFact>>(
        `/facts/author/${authorId}`,
        { page: '1', limit: '20' },
      );
      const raw = response?.results ?? (Array.isArray(response) ? response : []);
      const facts = mapFactsDtos(raw as ApiFact[]);
      set({ facts, factsLoading: false });
    } catch (error) {
      set({ factsLoading: false, facts: [] });
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
    }
  },

  clearProfile: () => {
    set({ profile: null, facts: [] });
  },
}));
