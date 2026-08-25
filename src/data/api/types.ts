/**
 * Backend API response types (DTOs).
 * These represent the raw shapes returned by the backend at localhost:3009.
 * Mappers in src/data/mappers convert these to domain types.
 */

/** RFC 9457 Problem Details error body */
export interface ApiErrorResponse {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  /** Backend error code (RFC 9457 "error_code") — surfaced on AppError.code */
  error_code?: string;
  /** Legacy error format fallback */
  error?: {
    code: string;
    message: string;
    field?: string;
  };
}

export interface ApiPaginatedResponse<T> {
  results: T[];
  nextPage: number | null;
}

/** Feed timeline item — the backend wraps every feed entry (a fact or a
 *  repost) in an envelope: { type, fact| repost, createdAt }. */
export type ApiFactFeedItem =
  | { type: 'fact'; fact: ApiFact; createdAt: string }
  | { type: 'repost'; repost: ApiRepostResponse; createdAt: string };

export interface ApiRepostAuthor {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  isMe: boolean;
}

/** Repost response from the feed — contains the repost metadata + original fact data. */
export interface ApiRepostResponse {
  id: string;
  factId: string;
  author: ApiAuthor;
  title: string | null;
  content: string;
  hashtags: ApiHashtag[];
  repostCount: number;
  repostedBy: ApiRepostAuthor;
  repostLikeCount: number;
  repostCommentCount: number;
  repostCommentsDetails?: ApiCommentPreview | null;
  createdAt: string;
}

export interface ApiHashtag {
  id: string;
  tag: string;
  usageCount?: number;
}

/** Slim user avatar preview (no displayName) — used in likeBy, repostBy and commentsDetails. */
export interface ApiUserAvatarPreview {
  username: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
}

/** Full comment author — used in CommentResponse. */
export interface ApiCommentAuthor {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
}

/** Preview of the first top-level comment carried on FactResponse (commentsDetails). */
export interface ApiCommentPreview {
  id: string;
  content: string;
  author: ApiUserAvatarPreview;
  parentCommentId: string | null;
  replies: number;
  createdAt: string;
}

/** Full comment — CommentResponse from comments endpoints (3.1–3.5). */
export interface ApiComment {
  id: string;
  content: string;
  author: ApiCommentAuthor;
  parentCommentId: string | null;
  /** Present only in the flat per-user list (GET /users/:userId/comments). */
  factId?: string;
  createdAt: string;
  updatedAt?: string;
  edited: boolean;
  /** Present only in the threaded list (GET /facts/:factId/comments). */
  replies?: ApiComment[];
  /** Like count for the comment (viewer-aware — populated only for authenticated viewers). */
  likesCount?: number;
  /** Whether the current viewer has liked this comment. */
  liked?: boolean;
  /** Up to 2 most recent likers (slim previews). */
  likeBy?: ApiUserAvatarPreview[];
}

/** Paginated comments response. */
export interface ApiCommentsResponse {
  results: ApiComment[];
  page: number;
  limit: number;
  nextPage: number | null;
}

export interface ApiFact {
  id: string;
  title?: string | null;
  content: string;
  author: ApiAuthor;
  likes: number;
  liked?: boolean;
  likeBy?: ApiUserAvatarPreview[];
  repostCount?: number;
  repostedByMe?: boolean;
  repostBy?: ApiUserAvatarPreview[];
  comments?: number;
  commentsDetails?: ApiCommentPreview | null;
  hashtags: ApiHashtag[];
  createdAt: string;
  updatedAt?: string;
}

export interface ApiAuthor {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  avatarColor?: string;
  createdAt?: string;
}

export interface ApiUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  avatarColor?: string;
  createdAt: string;
}

/** Response from POST /auth/profile */
export interface ApiProfileResponse {
  firebaseUid: string;
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  avatarColor?: string;
}

/** Response from GET /users/search */
export interface ApiUserSearchResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarColor?: string;
}

/** Response from GET /users/check-username */
export interface ApiUsernameCheck {
  available: boolean;
}

/** Like entry from GET /facts/:id/likes (signed-in only — likes are not exposed to anonymous users) */
export interface ApiFactLike {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  avatarColor?: string;
  createdAt: string;
}

/** Response from GET /users/avatar-options */
export interface ApiAvatarOption {
  id: string;
  url: string | null;
  color: string | null;
}

/** Response from GET /facts/search */
export interface ApiSearchResponse {
  users: ApiAuthor[];
  facts: ApiFact[];
  hashtags: ApiHashtag[];
  page: number;
  limit: number;
  hasMore: boolean;
}

/** Response from GET /hashtags */
export interface ApiHashtagsResponse {
  results: ApiHashtag[];
}
