import { useCallback, useEffect, useRef, useState } from 'react';
import type { Fact } from '@/types';
import { createApiClient } from '@/data/api/client';
import { getIdToken } from '@/data/auth/firebaseAuth';
import type { ApiAuthor, ApiFact, ApiFactFeedItem, ApiPaginatedResponse } from '@/data/api/types';
import { mapFactsDtos } from '@/data/mappers/factMapper';
import { applyEntryUpdate, subscribeEntryUpdates } from './entryUpdateBus';

const client = createApiClient(getIdToken);

/** Raw shape returned by GET /users/:username/mentions.
 *  The backend wraps each mention as { id, type, author, createdAt, fact: { id, title, content } }.
 *  The inner `fact` is SLIM — no likes, hashtags, etc. The `author` lives at the envelope level. */
interface ApiMentionEnvelope {
  id: string;
  type: 'fact';
  author: ApiAuthor;
  createdAt: string;
  fact: Pick<ApiFact, 'id' | 'title' | 'content'>;
}

/** Shape returned by the mentioned-facts hook. */
export interface MentionedFactsState {
  mentionedFacts: Fact[];
  mentionsLoading: boolean;
  mentionsCount: number;
  refetch: () => void;
}

/**
 * Fetches facts that mention the current user via GET /users/:username/mentions.
 * The hook fetches on mount/focus and exposes loading + cached list.
 */
export function useMentionedFacts(username?: string): MentionedFactsState {
  const [mentionedFacts, setMentionedFacts] = useState<Fact[]>([]);
  const [mentionsLoading, setMentionedLoading] = useState(false);
  const activeRef = useRef(true);

  const fetchMentions = useCallback(() => {
    if (!username) return;
    setMentionedLoading(true);
    client
      .get<ApiPaginatedResponse<ApiMentionEnvelope>>(`/users/${username}/mentions`, {
        page: '1',
        limit: '50',
      })
      .then((data) => {
        // The backend returns slim envelopes: author is at envelope level,
        // inner fact only has id/title/content. Merge into full ApiFactFeedItem
        // so the mapper can process them correctly.
        const feedItems: ApiFactFeedItem[] = (data.results ?? []).map((item) => ({
          type: 'fact' as const,
          createdAt: item.createdAt,
          fact: {
            id: item.fact.id,
            title: item.fact.title ?? null,
            content: item.fact.content,
            author: item.author,
            likes: 0,
            hashtags: [],
            createdAt: item.createdAt,
          } as ApiFact,
        }));
        const facts = mapFactsDtos(feedItems);
        if (activeRef.current) setMentionedFacts(facts);
      })
      .catch(() => {
        if (activeRef.current) setMentionedFacts([]);
      })
      .finally(() => {
        if (activeRef.current) setMentionedLoading(false);
      });
  }, [username]);

  useEffect(() => {
    activeRef.current = true;
    fetchMentions();
    return () => {
      activeRef.current = false;
    };
  }, [fetchMentions]);

  // Live-update: like/repost actions elsewhere broadcast patches — apply them
  // to this list so cards react instantly in the Mentions tab too.
  useEffect(
    () =>
      subscribeEntryUpdates((scope, anchor, patch) => {
        setMentionedFacts((prev) => applyEntryUpdate(prev, scope, anchor, patch));
      }),
    [],
  );

  return {
    mentionedFacts,
    mentionsLoading,
    mentionsCount: mentionedFacts.length,
    refetch: fetchMentions,
  };
}
