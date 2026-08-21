import type { Comment, CommentAuthor, CommentPreview, LikePreview } from '@/types';
import type {
  ApiComment,
  ApiCommentAuthor,
  ApiCommentPreview,
  ApiUserAvatarPreview,
} from '../api/types';

/**
 * Maps a full API comment author to a domain CommentAuthor.
 * Falls back to the username when displayName is absent (slim shapes).
 */
export function mapCommentAuthorDto(dto: ApiCommentAuthor): CommentAuthor {
  const username = dto.username ?? 'unknown';
  return {
    username,
    displayName: dto.displayName ?? username,
    avatarUrl: dto.avatarUrl ?? null,
    avatarColor: dto.avatarColor ?? null,
  };
}

/**
 * Maps a slim API user avatar preview to a domain LikePreview.
 */
export function mapLikePreviewDto(dto: ApiUserAvatarPreview): LikePreview {
  return {
    username: dto.username,
    avatarUrl: dto.avatarUrl ?? null,
    avatarColor: dto.avatarColor ?? null,
  };
}

/**
 * Maps an API comment preview (embedded in commentsDetails) to a domain CommentPreview.
 */
export function mapCommentPreviewDto(dto: ApiCommentPreview): CommentPreview {
  return {
    id: dto.id,
    content: dto.content,
    author: mapLikePreviewDto(dto.author),
    parentCommentId: dto.parentCommentId,
    replies: dto.replies,
    createdAt: dto.createdAt,
  };
}

/**
 * Maps a full API comment to a domain Comment.
 * Nested replies, when present, are mapped recursively.
 */
export function mapCommentDto(dto: ApiComment): Comment {
  return {
    id: dto.id,
    content: dto.content,
    author: mapCommentAuthorDto(dto.author),
    parentCommentId: dto.parentCommentId,
    factId: dto.factId,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt ?? dto.createdAt,
    edited: dto.edited,
    likesCount: dto.likesCount ?? 0,
    liked: dto.liked ?? false,
    likeBy: (dto.likeBy ?? []).map(mapLikePreviewDto),
    replies: dto.replies ? mapCommentsDtos(dto.replies) : undefined,
  };
}

/**
 * Maps an array of API comments to domain Comments.
 */
export function mapCommentsDtos(dtos: ApiComment[]): Comment[] {
  return dtos.map(mapCommentDto);
}
