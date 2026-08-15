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

export interface Fact {
  id: string;
  title?: string;
  content: string;
  author: Author;
  likesCount: number;
  liked: boolean;
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
