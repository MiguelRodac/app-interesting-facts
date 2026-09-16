import { create } from 'zustand';
import type { Author, Fact, Hashtag } from '@/types';
import { createApiClient } from '@/shared/api/client';
import type { ApiSearchResponse, ApiHashtag } from '@/shared/api/types';
import { mapFactsDtos } from '@/features/facts/mappers/factMapper';
import { mapAuthorDto } from '@/features/profile/mappers/userMapper';
import { getIdToken } from '@/features/auth';


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
  hasMorePosts: boolean;
  hasMorePeople: boolean;
  hasMoreHashtags: boolean;
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
  limit: 20,
  hasMore: false,
  hasMorePosts: false,
  hasMorePeople: false,
  hasMoreHashtags: false,
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
        hasMorePosts: false,
        hasMorePeople: false,
        hasMoreHashtags: false,
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
        limit: '20',
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

      const limitVal = response.limit ?? 20;
      const globalHasMore = response.hasMore ?? false;

      set({
        peopleResults: mappedUsers,
        postsResults: mappedPosts,
        hashtagsResults: mappedHashtags,
        page: response.page ?? 1,
        limit: limitVal,
        hasMore: globalHasMore,
        hasMorePosts: globalHasMore && mappedPosts.length >= limitVal,
        hasMorePeople: globalHasMore && mappedUsers.length >= limitVal,
        hasMoreHashtags: globalHasMore && mappedHashtags.length >= limitVal,
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
    const {
      query,
      page,
      limit,
      hasMore,
      isLoading,
      isLoadingMore,
      activeTab,
      hasMorePosts,
      hasMorePeople,
      hasMoreHashtags,
      postsResults,
      peopleResults,
      hashtagsResults,
    } = get();

    const canActiveTabLoadMore =
      activeTab === 'posts'
        ? hasMorePosts
        : activeTab === 'people'
          ? hasMorePeople
          : hasMoreHashtags;

    if (!query.trim() || !hasMore || !canActiveTabLoadMore || isLoading || isLoadingMore) {
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
      const rawUsers = response.users ?? [];
      const newUsers = rawUsers.map(mapAuthorDto);
      const rawHashtags = response.hashtags ?? [];
      const newHashtags = rawHashtags.map((h) => ({
        id: h.id || h.tag,
        tag: h.tag.startsWith('#') ? h.tag.slice(1) : h.tag,
      }));

      // If the response returned 0 total items across all groups, force hasMore to false to prevent loops
      if (newPosts.length === 0 && newUsers.length === 0 && newHashtags.length === 0) {
        set({
          hasMore: false,
          hasMorePosts: false,
          hasMorePeople: false,
          hasMoreHashtags: false,
          isLoadingMore: false,
        });
        return;
      }

      const byIdPosts = new Map(postsResults.map((p) => [p.id, p]));
      for (const item of newPosts) byIdPosts.set(item.id, item);

      const byIdUsers = new Map(peopleResults.map((u) => [u.username, u]));
      for (const item of newUsers) byIdUsers.set(item.username, item);

      const byIdHashtags = new Map(hashtagsResults.map((h) => [h.tag, h]));
      for (const item of newHashtags) byIdHashtags.set(item.tag, item);

      const currentLimit = response.limit ?? limit;
      const globalHasMore = response.hasMore ?? false;
      const nextHasMorePosts = globalHasMore && newPosts.length >= currentLimit;
      const nextHasMorePeople = globalHasMore && newUsers.length >= currentLimit;
      const nextHasMoreHashtags = globalHasMore && newHashtags.length >= currentLimit;

      set({
        postsResults: Array.from(byIdPosts.values()),
        peopleResults: Array.from(byIdUsers.values()),
        hashtagsResults: Array.from(byIdHashtags.values()),
        page: response.page ?? nextPage,
        hasMore: globalHasMore && (nextHasMorePosts || nextHasMorePeople || nextHasMoreHashtags),
        hasMorePosts: nextHasMorePosts,
        hasMorePeople: nextHasMorePeople,
        hasMoreHashtags: nextHasMoreHashtags,
        isLoadingMore: false,
      });
    } catch {
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
      hasMorePosts: false,
      hasMorePeople: false,
      hasMoreHashtags: false,
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
