import type { Fact, FactCommentPreview, FactLike, Hashtag } from '@/types';
import type {
  ApiFact,
  ApiFactCommentPreview,
  ApiFactLikeByEntry,
  ApiHashtag,
} from '../api/types';
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
 * Maps an inline API like entry to a domain FactLike.
 */
function mapLikeByEntryDto(dto: ApiFactLikeByEntry): FactLike {
  return {
    username: dto.username,
    avatarUrl: dto.avatarUrl ?? null,
    avatarColor: dto.avatarColor ?? null,
  };
}

/**
 * Maps the inline API comment preview to a domain FactCommentPreview.
 * Returns null when the backend provides none.
 */
function mapCommentPreviewDto(
  dto: ApiFactCommentPreview | null | undefined,
): FactCommentPreview | null {
  if (!dto) return null;
  return {
    id: dto.id,
    content: dto.content,
    author: {
      username: dto.author.username,
      avatarUrl: dto.author.avatarUrl ?? null,
      avatarColor: dto.author.avatarColor ?? null,
    },
    replies: dto.replies,
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
    likeBy: dto.likeBy?.map(mapLikeByEntryDto) ?? [],
    commentsCount: dto.comments ?? 0,
    commentPreview: mapCommentPreviewDto(dto.commentsDetails),
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
