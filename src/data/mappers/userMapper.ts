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
    avatarColor: dto.avatarColor ?? generateAvatarColor(username),
    avatarUrl: dto.avatarUrl ?? null,
  };
}

/**
 * Maps an API User (full user/profile responses) to a domain Author.
 * Handles both APIUser (id) and /auth/profile response (firebaseUid).
 */
export function mapUserDto(
  dto: ApiUser | { firebaseUid: string; username: string; displayName: string; email?: string; avatarUrl?: string; avatarColor?: string },
): Author {
  return {
    id: 'firebaseUid' in dto ? dto.firebaseUid : dto.id,
    username: dto.username,
    displayName: dto.displayName,
    email: 'email' in dto ? dto.email : undefined,
    avatarColor: ('avatarColor' in dto && dto.avatarColor) || generateAvatarColor(dto.username),
    avatarUrl: dto.avatarUrl ?? null,
  };
}

/**
 * Deterministic avatar color from username.
 * Returns a hex color string for the initials-based avatar.
 */
function generateAvatarColor(username: string): string {
  const colors = [
    '#E57373', '#F06292', '#BA68C8', '#9575CD',
    '#7986CB', '#64B5F6', '#4FC3F7', '#4DD0E1',
    '#4DB6AC', '#81C784', '#AED581', '#FFD54F',
    '#FFB74D', '#FF8A65', '#A1887F', '#90A4AE',
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
