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

/** Slim user preview (no displayName) — used for likeBy and comment-preview authors. */
export interface LikePreview {
  username: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
}

/** Full comment author (has displayName). */
export interface CommentAuthor {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
}

/** Preview of the first top-level comment on a fact (see FactResponse.commentsDetails). */
export interface CommentPreview {
  id: string;
  content: string;
  author: LikePreview;
  parentCommentId: string | null;
  replies: number;
  createdAt: string;
}

/** A comment (top-level or reply) from the comments module. */
export interface Comment {
  id: string;
  content: string;
  author: CommentAuthor;
  parentCommentId: string | null;
  /** Present only when the comment came from the flat per-user list. */
  factId?: string;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  /** Nested replies, present only in threaded responses. */
  replies?: Comment[];
  /**
   * Like count for the comment. The backend does NOT expose comment likes yet
   * (no CommentResponse.likesCount), so this is undefined until the contract
   * lands — the UI renders 0 as a visual placeholder.
   */
  likesCount?: number;
  /** Whether the current user has liked this comment — undefined for anonymous viewers. */
  liked?: boolean;
  /** Up to 2 most recent likers (slim previews) — undefined for anonymous viewers. */
  likeBy?: LikePreview[];
}

export interface Fact {
  id: string;
  title?: string;
  content: string;
  author: Author;
  likesCount: number;
  liked: boolean;
  likeBy: LikePreview[];
  repostCount: number;
  repostedByMe: boolean;
  repostBy: LikePreview[];
  commentsCount: number;
  commentPreview: CommentPreview | null;
  hashtags: Hashtag[];
  createdAt: string;
  /** True when this feed entry is a repost (the inner fact belongs to another author). */
  isRepost?: boolean;
  /** Username of the user who reposted this fact (present when isRepost is true). */
  reposterUsername?: string;
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
