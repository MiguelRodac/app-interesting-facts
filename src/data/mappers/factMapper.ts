import type { Fact, Hashtag } from '@/types';
import type { ApiFact, ApiFactFeedItem, ApiHashtag, ApiRepostResponse } from '../api/types';
import { mapCommentPreviewDto, mapLikePreviewDto } from './commentMapper';
import { mapAuthorDto } from './userMapper';

/**
 * Maps an API Hashtag (object or string) to a domain Hashtag.
 */
function mapHashtagDto(dto: ApiHashtag | string): Hashtag {
  if (typeof dto === 'string') {
    const clean = dto.startsWith('#') ? dto.slice(1) : dto;
    return {
      id: clean,
      tag: clean,
    };
  }
  const clean = dto.tag?.startsWith('#') ? dto.tag.slice(1) : (dto.tag ?? '');
  return {
    id: dto.id || clean,
    tag: clean,
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
    repostLikeCount: 0,
    repostLiked: false,
    repostCommentCount: 0,
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
 * Maps an API Repost DTO to a domain Fact.
 * The repost's own data becomes the Fact's data, with the original fact's
 * author shown as the card author and the reposter shown in the banner.
 */
export function mapRepostDto(repost: ApiRepostResponse): Fact {
  return {
    id: repost.id,
    title: repost.title ?? undefined,
    content: repost.content,
    author: mapAuthorDto(repost.author),
    likesCount: 0,
    liked: false,
    likeBy: (repost.likeBy ?? []).map(mapLikePreviewDto),
    repostCount: repost.repostCount ?? 0,
    repostedByMe: repost.repostedBy?.isMe ?? false,
    repostBy: [],
    repostLikeCount: repost.repostLikeCount ?? 0,
    repostLiked: repost.liked ?? false,
    repostCommentCount: repost.repostCommentCount ?? 0,
    commentsCount: 0,
    commentPreview: null,
    hashtags: repost.hashtags?.map(mapHashtagDto) ?? [],
    createdAt: repost.createdAt,
    isRepost: true,
    reposterUsername: repost.repostedBy?.username ?? '',
    reposter: repost.repostedBy
      ? {
          username: repost.repostedBy.username,
          displayName: repost.repostedBy.displayName,
          avatarUrl: repost.repostedBy.avatarUrl,
          avatarColor: repost.repostedBy.avatarColor,
          isMe: repost.repostedBy.isMe ?? false,
        }
      : undefined,
    originalFactId: repost.factId,
  };
}

/**
 * Maps an array of API feed entries to domain Facts.
 *
 * Feed-style endpoints (/facts, /facts/author/:id) wrap every entry in a
 * timeline envelope { type, fact | repost, createdAt }.
 * - type: 'fact' → the inner `fact` is a FactResponse
 * - type: 'repost' → the inner `repost` is a RepostResponse with its own ID
 */
export function mapFactsDtos(dtos?: (ApiFact | ApiFactFeedItem)[] | null): Fact[] {
  if (!Array.isArray(dtos)) return [];
  const seen = new Set<string>();
  const facts: Fact[] = [];
  for (const item of dtos) {
    if (!item) continue;
    const entry = item as ApiFactFeedItem;

    if (entry.type === 'repost' && 'repost' in entry) {
      const repost = entry.repost;
      if (!repost?.id) continue;
      // Dedupe by repost ID
      if (seen.has(repost.id)) continue;
      seen.add(repost.id);
      facts.push(mapRepostDto(repost));
    } else {
      const dto = ('fact' in entry ? entry.fact : entry) as ApiFact;
      if (!dto?.id) continue;
      if (seen.has(dto.id)) continue;
      seen.add(dto.id);
      facts.push(mapFactDto(dto));
    }
  }
  return facts;
}
