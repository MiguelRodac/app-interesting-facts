import { create } from 'zustand';

import type { Fact, PublicProfile } from '@/types';
import { createApiClient } from '../api/client';
import type { ApiAuthor, ApiFact, ApiPaginatedResponse } from '../api/types';
import { getIdToken } from '../auth/firebaseAuth';
import { mapFactsDtos } from '../mappers/factMapper';
import { mapAuthorDto } from '../mappers/userMapper';
import { notifyFactLikesChanged } from '../hooks/useFactLikes';
import { useUIStore } from './uiStore';

const client = createApiClient(getIdToken);

interface UserProfileState {
  profile: PublicProfile | null;
  facts: Fact[];
  isLoading: boolean;
  factsLoading: boolean;
  fetchProfile: (username: string, silent?: boolean) => Promise<void>;
  fetchUserFacts: (authorId: string, silent?: boolean) => Promise<void>;
  toggleLike: (factId: string) => Promise<void>;
  toggleRepost: (factId: string) => Promise<void>;
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

  toggleLike: async (factId: string) => {
    const { facts } = get();
    const fact = facts.find((f) => f.id === factId);
    if (!fact) return;

    const wasLiked = fact.liked;
    const nextFacts = facts.map((f) =>
      f.id === factId
        ? { ...f, liked: !wasLiked, likesCount: f.likesCount + (wasLiked ? -1 : 1) }
        : f,
    );
    set({ facts: nextFacts });

    try {
      if (wasLiked) {
        await client.del(`/facts/${factId}/likes`);
      } else {
        await client.post(`/facts/${factId}/likes`);
      }
      // Live-update "Liked by …" lines across every mounted screen
      notifyFactLikesChanged(factId);
    } catch (error) {
      set({ facts });
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
    }
  },

  toggleRepost: async (factId: string) => {
    const { facts } = get();
    const fact = facts.find((f) => f.id === factId);
    if (!fact) return;

    const wasReposted = fact.repostedByMe;
    const nextFacts = facts.map((f) =>
      f.id === factId
        ? {
            ...f,
            repostedByMe: !wasReposted,
            repostCount: f.repostCount + (wasReposted ? -1 : 1),
          }
        : f,
    );
    set({ facts: nextFacts });

    try {
      if (wasReposted) {
        await client.del(`/facts/${factId}/reposts`);
      } else {
        await client.post(`/facts/${factId}/reposts`);
      }
    } catch (error) {
      set({ facts });
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
    }
  },

  clearProfile: () => {
    set({ profile: null, facts: [] });
  },
}));
