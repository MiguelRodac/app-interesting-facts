import { create } from 'zustand';
import type { Author, Fact, Hashtag } from '@/types';
import { createApiClient } from '../api/client';
import type { ApiSearchResponse } from '../api/types';
import { mapFactsDtos } from '../mappers/factMapper';
import { mapAuthorDto } from '../mappers/userMapper';
import { getIdToken } from '../auth/firebaseAuth';

const client = createApiClient(getIdToken);

export type SearchTab = 'people' | 'posts' | 'hashtags';

interface SearchState {
  query: string;
  activeTab: SearchTab;
  peopleResults: Author[];
  postsResults: Fact[];
  hashtagsResults: Hashtag[];
  isLoading: boolean;
  setQuery: (q: string) => void;
  setActiveTab: (t: SearchTab) => void;
  search: (q: string) => Promise<void>;
  clearResults: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  activeTab: 'people',
  peopleResults: [],
  postsResults: [],
  hashtagsResults: [],
  isLoading: false,

  setQuery: (q) => set({ query: q }),

  setActiveTab: (t) => set({ activeTab: t }),

  search: async (q: string) => {
    if (!q.trim()) {
      set({ peopleResults: [], postsResults: [], hashtagsResults: [], isLoading: false });
      return;
    }

    set({ isLoading: true });

    try {
      const response = await client.get<ApiSearchResponse>('/facts/search', { q });

      set({
        peopleResults: response.users.map(mapAuthorDto),
        postsResults: mapFactsDtos(response.facts),
        hashtagsResults: response.hashtags.map((h) => ({ id: h.id, tag: h.tag })),
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      if (error && typeof error === 'object' && 'code' in error) {
        // Error handled by uiStore
      }
    }
  },

  clearResults: () =>
    set({
      peopleResults: [],
      postsResults: [],
      hashtagsResults: [],
      query: '',
    }),
}));
