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

export interface ApiHashtag {
  id: string;
  tag: string;
  usageCount?: number;
}

export interface ApiFact {
  id: string;
  title?: string | null;
  content: string;
  author: ApiAuthor;
  likes: number;
  liked?: boolean;
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
