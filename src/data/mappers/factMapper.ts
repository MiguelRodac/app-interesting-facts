import type { Fact, Hashtag } from '@/types';
import type { ApiFact, ApiHashtag } from '../api/types';
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
 */
export function mapFactsDtos(dtos: ApiFact[]): Fact[] {
  return dtos.map((dto) => mapFactDto(dto));
}
