import type { Fact, Hashtag } from '@/types';
import type { ApiFact, ApiFactFeedItem, ApiHashtag } from '../api/types';
import { mapCommentPreviewDto, mapLikePreviewDto } from './commentMapper';
import { mapAuthorDto } from './userMapper';

/**
 * Maps an API Hashtag to a domain Hashtag.
 */
function mapHashtagDto(dto: ApiHashtag): Hashtag {
  return {
    id: dto.id,
    tag: dto.tag,
  };
}

/**
 * Maps an API Fact DTO to a domain Fact.
 *
 * @param dto - Raw API fact object (includes `liked` from backend)
 */
export function mapFactDto(dto: ApiFact): Fact {
  return {
    id: dto.id,
    title: dto.title ?? undefined,
    content: dto.content,
    author: mapAuthorDto(dto.author),
    likesCount: dto.likes,
    liked: dto.liked ?? false,
    likeBy: (dto.likeBy ?? []).map(mapLikePreviewDto),
    repostCount: dto.repostCount ?? 0,
    repostedByMe: dto.repostedByMe ?? false,
    repostBy: (dto.repostBy ?? []).map(mapLikePreviewDto),
    commentsCount: dto.comments ?? 0,
    commentPreview:
      dto.comments !== 0 && dto.commentsDetails
        ? mapCommentPreviewDto(dto.commentsDetails)
        : null,
    hashtags: dto.hashtags?.map(mapHashtagDto) ?? [],
    createdAt: dto.createdAt,
  };
}

/**
 * Maps an array of API Facts to domain Facts.
 *
 * Feed-style endpoints (/facts, /facts/author/:id) wrap every entry in a
 * timeline envelope { type, fact, repostedBy?, createdAt? } that mixes facts
 * with reposts. A repost is a SEPARATE feed entry — it appears as its own
 * card with "Reposted by @user" above the original author. The same fact
 * can appear multiple times (original + N reposts by different users), so
 * we only dedupe reposts from the SAME reposter (duplicate repost events).
 * FlatList keys use a composite key to keep them unique.
 */
export function mapFactsDtos(dtos: (ApiFact | ApiFactFeedItem)[]): Fact[] {
  const seen = new Set<string>();
  const facts: Fact[] = [];
  for (const item of dtos) {
    const envelope = 'fact' in (item as ApiFactFeedItem) ? (item as ApiFactFeedItem) : null;
    const dto = envelope?.fact ?? (item as ApiFact);
    if (!dto?.id) continue;

    const isRepost = envelope?.type === 'repost' && !!envelope.repostedBy;
    // Composite key: reposts by different users are separate entries;
    // only drop exact duplicates (same fact + same reposter).
    const key = isRepost
      ? `repost-${dto.id}-${envelope!.repostedBy!.username}`
      : `fact-${dto.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const fact = mapFactDto(dto);
    // FlatList key needs to be globally unique — reposts get a suffix.
    if (isRepost) {
      fact.originalFactId = dto.id;
      fact.id = `${dto.id}-repost-${envelope!.repostedBy!.username}`;
      fact.isRepost = true;
      fact.reposterUsername = envelope!.repostedBy!.username;
      // Use the repost timestamp, not the original fact's createdAt.
      if (envelope!.createdAt) {
        fact.createdAt = envelope!.createdAt;
      }
    }
    facts.push(fact);
  }
  return facts;
}
