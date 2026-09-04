import type { Author } from '@/types';
import type { ApiAuthor, ApiUser } from '../api/types';

/**
 * Maps an API Author (nested in fact responses) to a domain Author.
 */
export function mapAuthorDto(dto: ApiAuthor): Author {
  const username = dto.username ?? 'unknown';
  return {
    id: dto.id,
    username,
    displayName: dto.displayName ?? username,
    avatarColor: dto.avatarColor ?? null,
    avatarUrl: dto.avatarUrl ?? null,
  };
}

/**
 * Maps an API User (full user/profile responses) to a domain Author.
 * Handles both APIUser (id) and /auth/profile response (firebaseUid).
 */
export function mapUserDto(
  dto: ApiUser | { firebaseUid: string; username: string; displayName: string; email?: string; avatarUrl?: string | null; avatarColor?: string | null },
): Author {
  return {
    id: 'firebaseUid' in dto ? dto.firebaseUid : dto.id,
    username: dto.username,
    displayName: dto.displayName,
    email: 'email' in dto ? dto.email : undefined,
    avatarColor: ('avatarColor' in dto && dto.avatarColor) ? dto.avatarColor : null,
    avatarUrl: dto.avatarUrl ?? null,
  };
}
