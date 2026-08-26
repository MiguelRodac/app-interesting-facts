import { useUserProfileStore } from '../stores/userProfileStore';

/**
 * User profile hook — thin wrapper over userProfileStore for component consumption.
 * Provides stable selectors to minimize re-renders.
 * Liked entries live in useUserLikes (shared by own + visited profiles).
 */
export function useUserProfile() {
  const profile = useUserProfileStore((s) => s.profile);
  const facts = useUserProfileStore((s) => s.facts);
  const isLoading = useUserProfileStore((s) => s.isLoading);
  const factsLoading = useUserProfileStore((s) => s.factsLoading);
  const fetchProfile = useUserProfileStore((s) => s.fetchProfile);
  const fetchUserFacts = useUserProfileStore((s) => s.fetchUserFacts);
  const toggleLike = useUserProfileStore((s) => s.toggleLike);
  const toggleRepost = useUserProfileStore((s) => s.toggleRepost);
  const clearProfile = useUserProfileStore((s) => s.clearProfile);

  return {
    profile,
    facts,
    isLoading,
    factsLoading,
    fetchProfile,
    fetchUserFacts,
    toggleLike,
    toggleRepost,
    clearProfile,
  };
}
