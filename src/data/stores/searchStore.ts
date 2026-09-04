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
  page: number;
  limit: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  setQuery: (q: string) => void;
  setActiveTab: (t: SearchTab) => void;
  search: (q: string, preferredTab?: SearchTab) => Promise<void>;
  loadMore: () => Promise<void>;
  clearResults: () => void;
  togglePostLike: (factId: string) => void;
  togglePostRepostLike: (repostId: string) => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  activeTab: 'posts',
  peopleResults: [],
  postsResults: [],
  hashtagsResults: [],
  page: 1,
  limit: 10,
  hasMore: false,
  isLoading: false,
  isLoadingMore: false,

  setQuery: (q) => set({ query: q }),

  setActiveTab: (t) => set({ activeTab: t }),

  search: async (q: string, preferredTab?: SearchTab) => {
    const trimmed = q.trim();
    if (!trimmed) {
      set({
        peopleResults: [],
        postsResults: [],
        hashtagsResults: [],
        page: 1,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        activeTab: 'posts',
      });
      return;
    }

    set({ isLoading: true });

    try {
      const response = await client.get<ApiSearchResponse>('/facts/search', {
        q: trimmed,
        page: '1',
        limit: '10',
      });

      const rawPosts = response.results ?? response.facts ?? [];
      const rawUsers = response.users ?? [];
      const rawHashtags = response.hashtags ?? [];

      const mappedPosts = mapFactsDtos(rawPosts);
      const mappedUsers = rawUsers.map(mapAuthorDto);
      const mappedHashtags = rawHashtags.map((h) => ({
        id: h.id || h.tag,
        tag: h.tag.startsWith('#') ? h.tag.slice(1) : h.tag,
      }));

      let nextTab: SearchTab;
      if (preferredTab) {
        nextTab = preferredTab;
      } else if (trimmed.startsWith('@')) {
        nextTab = 'people';
      } else if (trimmed.startsWith('#')) {
        nextTab = 'hashtags';
      } else {
        // Global search: prioritize posts if non-empty,
        // otherwise select first non-empty tab, falling back to 'posts'.
        if (mappedPosts.length > 0) {
          nextTab = 'posts';
        } else if (mappedUsers.length > 0) {
          nextTab = 'people';
        } else if (mappedHashtags.length > 0) {
          nextTab = 'hashtags';
        } else {
          nextTab = 'posts';
        }
      }

      set({
        peopleResults: mappedUsers,
        postsResults: mappedPosts,
        hashtagsResults: mappedHashtags,
        page: response.page ?? 1,
        limit: response.limit ?? 10,
        hasMore: response.hasMore ?? false,
        activeTab: nextTab,
        isLoading: false,
        isLoadingMore: false,
      });
    } catch (error) {
      set({ isLoading: false, isLoadingMore: false });
      if (error && typeof error === 'object' && 'code' in error) {
        // Error handled by uiStore
      }
    }
  },

  loadMore: async () => {
    const { query, page, limit, hasMore, isLoading, isLoadingMore, activeTab, postsResults } = get();
    if (!query.trim() || !hasMore || isLoading || isLoadingMore || activeTab !== 'posts') {
      return;
    }

    set({ isLoadingMore: true });

    try {
      const nextPage = page + 1;
      const response = await client.get<ApiSearchResponse>('/facts/search', {
        q: query.trim(),
        page: String(nextPage),
        limit: String(limit),
      });

      const rawPosts = response.results ?? response.facts ?? [];
      const newPosts = mapFactsDtos(rawPosts);

      const byId = new Map(postsResults.map((p) => [p.id, p]));
      for (const item of newPosts) {
        byId.set(item.id, item);
      }

      set({
        postsResults: Array.from(byId.values()),
        page: response.page ?? nextPage,
        hasMore: response.hasMore ?? false,
        isLoadingMore: false,
      });
    } catch (error) {
      set({ isLoadingMore: false });
    }
  },

  clearResults: () =>
    set({
      peopleResults: [],
      postsResults: [],
      hashtagsResults: [],
      page: 1,
      hasMore: false,
      isLoading: false,
      isLoadingMore: false,
      query: '',
      activeTab: 'posts',
    }),

  togglePostLike: (factId: string) => {
    set((state) => ({
      postsResults: state.postsResults.map((p) => {
        if (p.id === factId && !p.isRepost) {
          const nextLiked = !p.liked;
          return {
            ...p,
            liked: nextLiked,
            likesCount: nextLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
          };
        }
        return p;
      }),
    }));
  },

  togglePostRepostLike: (repostId: string) => {
    set((state) => ({
      postsResults: state.postsResults.map((p) => {
        if (p.id === repostId && p.isRepost) {
          const nextLiked = !p.repostLiked;
          return {
            ...p,
            repostLiked: nextLiked,
            repostLikeCount: nextLiked ? (p.repostLikeCount ?? 0) + 1 : Math.max(0, (p.repostLikeCount ?? 0) - 1),
          };
        }
        return p;
      }),
    }));
  },
}));
