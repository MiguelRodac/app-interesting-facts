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
 * with reposts; only the inner `fact` maps for card rendering (repost-in-feed
 * treatment is a separate feature). The same fact can appear twice in one page
 * (once as a fact, once as a repost) — dedupe by id, first occurrence wins, so
 * FlatList keys stay unique. The flat ApiFact shape is still tolerated for
 * older/other endpoints (e.g. search), where the unwrap is a no-op.
 */
export function mapFactsDtos(dtos: (ApiFact | ApiFactFeedItem)[]): Fact[] {
  const seen = new Set<string>();
  const facts: Fact[] = [];
  for (const item of dtos) {
    const dto = 'fact' in (item as ApiFactFeedItem) ? (item as ApiFactFeedItem).fact : (item as ApiFact);
    if (!dto?.id || seen.has(dto.id)) continue;
    seen.add(dto.id);
    facts.push(mapFactDto(dto));
  }
  return facts;
}
