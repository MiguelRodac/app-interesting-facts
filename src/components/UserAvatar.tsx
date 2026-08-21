import { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import type { Author } from '@/types';

const FALLBACK_COLOR = '#64B5F6';

interface UserAvatarProps {
  user: Pick<Author, 'displayName'> & {
    avatarColor?: string | null;
    avatarUrl?: string | null;
  };
  size?: number;
}

function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  return (
    name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

export function UserAvatar({ user, size = 36 }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const hasImage = user.avatarUrl != null && user.avatarUrl.length > 0 && !imageError;

  useEffect(() => {
    setImageError(false);
  }, [user.avatarUrl]);

  const initials = getInitials(user?.displayName ?? '?');
  const fontSize = Math.round(size * 0.38);
  const backgroundColor = user.avatarColor ?? (hasImage ? 'transparent' : FALLBACK_COLOR);

  return (
    <View
      style={[
        styles.background,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ]}>
      {hasImage ? (
        <Image
          source={{ uri: user.avatarUrl ?? undefined }}
          style={[
            styles.image,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
          contentFit="cover"
          transition={200}
          onError={() => setImageError(true)}
          accessibilityLabel={`${user.displayName}'s avatar`}
        />
      ) : (
        <ThemedText
          type="smallBold"
          style={[styles.initials, { fontSize, color: '#FFFFFF' }]}>
          {initials}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    overflow: 'hidden',
  },
  initials: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
