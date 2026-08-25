import { useFactsStore } from '../stores/factsStore';
import { useRepostsStore } from '../stores/repostsStore';

/**
 * Facts hook — thin wrapper over factsStore + repostsStore for component
 * consumption. Provides stable selectors to minimize re-renders.
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
  const toggleRepostLike = useRepostsStore((s) => s.toggleRepostLike);
  const addRepostComment = useRepostsStore((s) => s.addRepostComment);
  const updateRepostComment = useRepostsStore((s) => s.updateRepostComment);
  const deleteRepostComment = useRepostsStore((s) => s.deleteRepostComment);
  const toggleRepostCommentLike = useRepostsStore((s) => s.toggleRepostCommentLike);

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
    toggleRepostLike,
    addRepostComment,
    updateRepostComment,
    deleteRepostComment,
    toggleRepostCommentLike,
  };
}
