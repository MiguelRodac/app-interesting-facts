import { useMemo } from 'react';
import { useFactsStore } from '../stores/factsStore';

/**
 * Derives the list of liked facts from the factsStore.
 * Each fact carries its own `liked` boolean from the backend.
 */
export function useLikedFacts() {
  const facts = useFactsStore((s) => s.facts);

  const likedFacts = useMemo(
    () => facts.filter((f) => f.liked === true),
    [facts],
  );

  return {
    likedFacts,
    likedCount: likedFacts.length,
    isLiked: (factId: string) => facts.find((f) => f.id === factId)?.liked === true,
  };
}
