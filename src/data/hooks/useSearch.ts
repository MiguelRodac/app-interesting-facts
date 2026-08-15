import { useSearchStore } from '../stores/searchStore';

/**
 * Search hook — thin wrapper over searchStore for component consumption.
 * Provides stable selectors to minimize re-renders.
 */
export function useSearch() {
  const query = useSearchStore((s) => s.query);
  const activeTab = useSearchStore((s) => s.activeTab);
  const peopleResults = useSearchStore((s) => s.peopleResults);
  const postsResults = useSearchStore((s) => s.postsResults);
  const hashtagsResults = useSearchStore((s) => s.hashtagsResults);
  const isLoading = useSearchStore((s) => s.isLoading);
  const setQuery = useSearchStore((s) => s.setQuery);
  const setActiveTab = useSearchStore((s) => s.setActiveTab);
  const search = useSearchStore((s) => s.search);
  const clearResults = useSearchStore((s) => s.clearResults);

  return {
    query,
    activeTab,
    peopleResults,
    postsResults,
    hashtagsResults,
    isLoading,
    setQuery,
    setActiveTab,
    search,
    clearResults,
  };
}
