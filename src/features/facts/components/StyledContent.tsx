import { Linking, Platform, Text, type StyleProp, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { parseContent } from '@/utils/parseContent';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/data/hooks/useAuth';
import { useUIStore } from '@/data/stores/uiStore';

interface StyledContentProps {
  content: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  /**
   * When false, #hashtag segments render as plain text (no link styling, no
   * navigation). @mention segments stay clickable. Used for comment content,
   * which has no hashtags indexed on the backend — a hashtag link there would
   * be a broken search. Defaults to true so fact content stays unchanged.
   */
  enableHashtags?: boolean;
}

/**
 * Renders text content with styled hashtags, mentions, and links.
 * Hashtags navigate to search screen with the hashtag pre-filled (unless
 * `enableHashtags={false}`, in which case they render as plain text).
 * Mentions navigate to the user's public profile.
 * URLs prompt a leave-app confirmation before opening in the external browser.
 */
export function StyledContent({
  content,
  style,
  numberOfLines,
  enableHashtags = true,
}: StyledContentProps) {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const segments = parseContent(content);

  const handleHashtagPress = (tag: string) => {
    // Remove the # prefix and encode for URL
    const tagName = tag.slice(1);
    router.push(`/(tabs)/search?q=%23${tagName}`);
  };

  const handleMentionPress = (mention: string) => {
    // Remove the @ prefix to get username
    const username = mention.slice(1);
    // If it's the current user, go to their own profile
    if (user && user.username === username) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/(tabs)/users/${username}`);
    }
  };

  const handleUrlPress = (url?: string) => {
    if (!url) return;
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;

    useUIStore.getState().showConfirm({
      title: t('leaveAppTitle'),
      message: `${t('leaveAppMessage')}\n\n${normalized}`,
      confirmLabel: t('continue'),
      cancelLabel: t('cancel'),
      onConfirm: async () => {
        try {
          if (Platform.OS === 'web') {
            window.open(normalized, '_blank', 'noopener,noreferrer');
          } else {
            await Linking.openURL(normalized);
          }
        } catch {
          // Ignore open error
        }
      },
    });
  };

  return (
    <Text numberOfLines={numberOfLines} style={[{ color: theme.text }, style]}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return (
            <Text key={index} style={{ color: theme.text }}>
              {segment.content}
            </Text>
          );
        }

        if (segment.type === 'hashtag') {
          // Without `enableHashtags`, render the hashtag as plain text like the
          // surrounding content — no link color, no onPress navigation.
          if (!enableHashtags) {
            return (
              <Text key={index} style={{ color: theme.text }}>
                {segment.content}
              </Text>
            );
          }
          return (
            <Text
              key={index}
              style={{ color: theme.primary }}
              onPress={(e) => {
                e?.stopPropagation?.();
                handleHashtagPress(segment.content);
              }}
            >
              {segment.content}
            </Text>
          );
        }

        if (segment.type === 'url') {
          const targetUrl = segment.url || segment.content;
          return (
            <Text
              key={index}
              accessibilityRole="link"
              {...(Platform.OS === 'web'
                ? {
                    href: targetUrl,
                    hrefAttrs: { target: '_blank', rel: 'noreferrer noopener' },
                  }
                : {})}
              style={{ color: theme.primary, textDecorationLine: 'underline' }}
              onPress={(e) => {
                e?.stopPropagation?.();
                if (Platform.OS === 'web') {
                  e?.preventDefault?.();
                }
                handleUrlPress(targetUrl);
              }}
            >
              {segment.content}
            </Text>
          );
        }

        // Mention
        return (
          <Text
            key={index}
            style={{ color: theme.primary }}
            onPress={(e) => {
              e?.stopPropagation?.();
              handleMentionPress(segment.content);
            }}
          >
            {segment.content}
          </Text>
        );
      })}
    </Text>
  );
}
