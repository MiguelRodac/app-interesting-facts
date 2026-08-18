import { create } from 'zustand';
import type { Fact } from '@/types';
import { createApiClient } from '../api/client';
import type { ApiFact, ApiPaginatedResponse } from '../api/types';
import { mapFactsDtos, mapFactDto } from '../mappers/factMapper';
import { getIdToken } from '../auth/firebaseAuth';
import { useAuthStore } from './authStore';
import { useUIStore } from './uiStore';

const PAGE_SIZE = 20;

const client = createApiClient(getIdToken);

interface FactsState {
  facts: Fact[];
  userFacts: Fact[];
  isLoading: boolean;
  userFactsLoading: boolean;
  page: number;
  hasMore: boolean;
  fetchFacts: () => Promise<void>;
  loadMore: () => Promise<void>;
  fetchUserFacts: (userId: string, silent?: boolean) => Promise<void>;
  toggleLike: (factId: string) => Promise<void>;
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

  fetchFacts: async () => {
    set({ isLoading: true });
    try {
      const { results, nextPage } = await client.get<ApiPaginatedResponse<ApiFact>>(
        '/facts',
        { page: '1', limit: String(PAGE_SIZE), order_by: 'createdAt', order_dir: 'desc' },
      );
      const facts = mapFactsDtos(results);
      set({ facts, page: 1, hasMore: nextPage !== null, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
    }
  },

  loadMore: async () => {
    const { isLoading, hasMore, page, facts } = get();
    if (isLoading || !hasMore) return;

    set({ isLoading: true });
    try {
      const nextPage = page + 1;
      const { results, nextPage: newNextPage } = await client.get<ApiPaginatedResponse<ApiFact>>(
        '/facts',
        { page: String(nextPage), limit: String(PAGE_SIZE), order_by: 'createdAt', order_dir: 'desc' },
      );
      const newFacts = mapFactsDtos(results);
      set({
        facts: [...facts, ...newFacts],
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

  fetchUserFacts: async (userId: string, silent?: boolean) => {
    // Silent refresh skips the loading state and error banner (background refresh)
    if (!silent) set({ userFactsLoading: true });
    try {
      const { results } = await client.get<ApiPaginatedResponse<ApiFact>>(
        `/facts/author/${userId}`,
        { page: '1', limit: String(PAGE_SIZE) },
      );
      const userFacts = mapFactsDtos(results);
      set({ userFacts, userFactsLoading: false });
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

    const wasLiked = fact.liked;

    // Optimistic update — keep feed and user facts in sync
    const newFacts = facts.map((f) =>
      f.id === factId
        ? { ...f, liked: !wasLiked, likesCount: f.likesCount + (wasLiked ? -1 : 1) }
        : f,
    );
    const newUserFacts = userFacts.map((f) =>
      f.id === factId
        ? { ...f, liked: !wasLiked, likesCount: f.likesCount + (wasLiked ? -1 : 1) }
        : f,
    );
    set({ facts: newFacts, userFacts: newUserFacts });

    try {
      if (wasLiked) {
        await client.del(`/facts/${factId}/likes`);
      } else {
        await client.post(`/facts/${factId}/likes`);
      }
    } catch (error) {
      // Rollback on error
      set({ facts, userFacts });
      if (error && typeof error === 'object' && 'code' in error) {
        useUIStore.getState().setError(error as import('@/types').AppError);
      }
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
