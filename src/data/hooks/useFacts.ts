import { useFactsStore } from '../stores/factsStore';

/**
 * Facts hook — thin wrapper over factsStore for component consumption.
 * Provides stable selectors to minimize re-renders.
 */
export function useFacts() {
  const facts = useFactsStore((s) => s.facts);
  const userFacts = useFactsStore((s) => s.userFacts);
  const isLoading = useFactsStore((s) => s.isLoading);
  const userFactsLoading = useFactsStore((s) => s.userFactsLoading);
  const hasMore = useFactsStore((s) => s.hasMore);
  const fetchFacts = useFactsStore((s) => s.fetchFacts);
  const loadMore = useFactsStore((s) => s.loadMore);
  const fetchFactById = useFactsStore((s) => s.fetchFactById);
  const addFact = useFactsStore((s) => s.addFact);
  const deleteFact = useFactsStore((s) => s.deleteFact);
  const toggleLike = useFactsStore((s) => s.toggleLike);
  const toggleRepost = useFactsStore((s) => s.toggleRepost);
  const fetchUserFacts = useFactsStore((s) => s.fetchUserFacts);

  return {
    facts,
    userFacts,
    isLoading,
    userFactsLoading,
    hasMore,
    fetchFacts,
    loadMore,
    fetchFactById,
    addFact,
    deleteFact,
    toggleLike,
    toggleRepost,
    fetchUserFacts,
  };
}
