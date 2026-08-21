import type { Fact } from '@/types';

/** Shape returned by the mentioned-facts hook. */
export interface MentionedFactsState {
  /** Facts that mention the current user. Empty until the backend endpoint ships. */
  mentionedFacts: Fact[];
  /** True while the mentions list is loading (always false in the mock). */
  mentionsLoading: boolean;
  /** Count of mentioned facts, used for the "Mentions" tab label. */
  mentionsCount: number;
}

/**
 * Mentioned facts — MOCK implementation.
 *
 * The backend mentions endpoint is not available yet, so this hook returns an
 * empty list and the profile "Mentions" tab renders its empty state. Wiring the
 * real endpoint means updating only this function (mirroring useFactComments:
 * fetch on mount/focus, expose loading + cached list).
 *
 * TODO(backend): replace the constant return with a real fetch when the backend
 * ships the mentions endpoint. Endpoint name TBD — candidates:
 *   - `GET /facts/mentioned-by-me`
 *   - `GET /users/:id/mentions`
 */
export function useMentionedFacts(): MentionedFactsState {
  return {
    mentionedFacts: [],
    mentionsLoading: false,
    mentionsCount: 0,
  };
}