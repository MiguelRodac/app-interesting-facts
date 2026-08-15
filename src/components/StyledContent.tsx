import { Text, Pressable, type StyleProp, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';

import { parseContent } from '@/utils/parseContent';
import { useTheme } from '@/hooks/use-theme';

interface StyledContentProps {
  content: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Renders text content with styled hashtags and mentions.
 * Hashtags navigate to search screen with the hashtag pre-filled.
 * Mentions navigate to the user's public profile.
 */
export function StyledContent({ content, style }: StyledContentProps) {
  const theme = useTheme();
  const router = useRouter();
  const segments = parseContent(content);

  const handleHashtagPress = (tag: string) => {
    // Remove the # prefix and encode for URL
    const tagName = tag.slice(1);
    router.push(`/(tabs)/search?q=%23${tagName}`);
  };

  const handleMentionPress = (mention: string) => {
    // Remove the @ prefix to get username
    const username = mention.slice(1);
    router.push(`/(tabs)/users/${username}`);
  };

  return (
    <Text style={[{ color: theme.text }, style]}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return (
            <Text key={index} style={{ color: theme.text }}>
              {segment.content}
            </Text>
          );
        }

        if (segment.type === 'hashtag') {
          return (
            <Text
              key={index}
              style={{ color: theme.primary }}
              onPress={() => handleHashtagPress(segment.content)}
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
            onPress={() => handleMentionPress(segment.content)}
          >
            {segment.content}
          </Text>
        );
      })}
    </Text>
  );
}
