import {
  upsertFact,
  mergeFacts,
  optimisticLikeBy,
  optimisticRepostBy,
} from '@/features/facts/stores/factsStoreHelpers';
import type { Author, Fact, FactLike } from '@/types';

describe('factsStoreHelpers business logic', () => {
  const author: Author = {
    id: 'user-1',
    username: 'rodac',
    displayName: 'Rodac',
    avatarUrl: 'https://example.com/avatar.png',
    avatarColor: '#123456',
  };

  const createDummyFact = (id: string, createdAt: string): Fact => ({
    id,
    author,
    content: `Content for ${id}`,
    likesCount: 0,
    liked: false,
    likeBy: [],
    repostCount: 0,
    repostedByMe: false,
    repostBy: [],
    repostLikeCount: 0,
    repostLiked: false,
    repostCommentCount: 0,
    commentsCount: 0,
    commentPreview: null,
    hashtags: [],
    createdAt,
  });

  describe('upsertFact', () => {
    it('appends and sorts new fact in createdAt-desc order', () => {
      const f1 = createDummyFact('1', '2026-01-01T00:00:00Z');
      const f3 = createDummyFact('3', '2026-01-03T00:00:00Z');
      const f2 = createDummyFact('2', '2026-01-02T00:00:00Z');

      const result = upsertFact([f3, f1], f2);
      expect(result.map((f) => f.id)).toEqual(['3', '2', '1']);
    });

    it('updates existing fact in-place when matching id is found', () => {
      const f1 = createDummyFact('1', '2026-01-01T00:00:00Z');
      const updatedF1: Fact = { ...f1, content: 'Updated content' };

      const result = upsertFact([f1], updatedF1);
      expect(result.length).toBe(1);
      expect(result[0].content).toBe('Updated content');
    });
  });

  describe('mergeFacts', () => {
    it('merges fresh facts, updates overlapping ids, and sorts by createdAt descending', () => {
      const existing1 = createDummyFact('1', '2026-01-01T00:00:00Z');
      const existing2 = createDummyFact('2', '2026-01-02T00:00:00Z');
      const freshUpdated2 = { ...existing2, content: 'Refreshed 2' };
      const fresh3 = createDummyFact('3', '2026-01-03T00:00:00Z');

      const merged = mergeFacts([existing2, existing1], [fresh3, freshUpdated2]);
      expect(merged.map((f) => f.id)).toEqual(['3', '2', '1']);
      expect(merged[1].content).toBe('Refreshed 2');
    });
  });

  describe('optimisticLikeBy', () => {
    it('prepends user on like and caps at 3 entries', () => {
      const initial: FactLike[] = [
        { username: 'alice' },
        { username: 'bob' },
        { username: 'carol' },
      ];

      const liked = optimisticLikeBy(initial, author, true);
      expect(liked.length).toBe(3);
      expect(liked[0].username).toBe('rodac');
      expect(liked[1].username).toBe('alice');
      expect(liked[2].username).toBe('bob');
    });

    it('removes user entry on unlike', () => {
      const initial: FactLike[] = [
        { username: 'alice' },
        { username: 'rodac' },
        { username: 'bob' },
      ];

      const unliked = optimisticLikeBy(initial, author, false);
      expect(unliked.map((u) => u.username)).toEqual(['alice', 'bob']);
    });
  });

  describe('optimisticRepostBy', () => {
    it('prepends user on repost and caps at 3 entries', () => {
      const initial: FactLike[] = [{ username: 'alice' }];
      const reposted = optimisticRepostBy(initial, author, true);

      expect(reposted[0].username).toBe('rodac');
      expect(reposted[1].username).toBe('alice');
    });

    it('removes user on un-repost', () => {
      const initial: FactLike[] = [{ username: 'rodac' }, { username: 'alice' }];
      const unReposted = optimisticRepostBy(initial, author, false);

      expect(unReposted.map((u) => u.username)).toEqual(['alice']);
    });
  });
});
