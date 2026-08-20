/**
 * Domain types consumed by screens and hooks.
 * These are the canonical shapes used throughout the app —
 * API DTOs are mapped to these before reaching any UI layer.
 */

export interface Author {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarColor: string;
  avatarUrl: string | null;
}

/** Public-facing profile with join date (extends Author for reuse with UserAvatar, FactCard, etc.) */
export interface PublicProfile extends Author {
  createdAt: string;
}

export interface Hashtag {
  id: string;
  tag: string;
}

/** A user who liked a fact — carried inline on the Fact for the feed (no N+1). */
export interface FactLike {
  username: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
}

/** Preview of the first top-level comment on a fact (see FactResponse.commentsDetails). */
export interface FactCommentPreview {
  id: string;
  content: string;
  author: {
    username: string;
    avatarUrl?: string | null;
    avatarColor?: string | null;
  };
  replies: number;
}

export interface Fact {
  id: string;
  title?: string;
  content: string;
  author: Author;
  likesCount: number;
  liked: boolean;
  likeBy: FactLike[];
  commentsCount: number;
  commentPreview: FactCommentPreview | null;
  hashtags: Hashtag[];
  createdAt: string;
}

export interface PaginatedResult<T> {
  results: T[];
  nextPage: number | null;
}

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  status: number;
}
