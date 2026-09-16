import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppPressable } from '@/shared/ui/app-pressable';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { StyledContent } from './StyledContent';
import { LikedByLine } from './LikedByLine';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { COLLAPSE_LINES, COLLAPSE_THRESHOLD, checkIsCollapsible } from '@/constants/facts';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useTheme } from '@/shared/hooks/use-theme';
import type { Fact } from '@/types';
import { FactCardHeader } from './FactCardHeader';
import { FactCardActions } from './FactCardActions';
import { FactCardCommentPreview } from './FactCardCommentPreview';

interface FactCardProps {
  fact: Fact;
  variant: 'anon' | 'preview' | 'full';
  onLike?: () => void;
  onRepost?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPress?: () => void;
  onOpenLikes?: () => void;
  onRepostLike?: () => void;
  onOpenRepostLikes?: () => void;
  isOwner?: boolean;
  isSignedIn?: boolean;
  onRequireLogin?: () => void;
}

export function FactCard({
  fact,
  variant,
  onLike,
  onRepost,
  onShare,
  onEdit,
  onDelete,
  onPress,
  onOpenLikes,
  onRepostLike,
  onOpenRepostLikes,
  isOwner = false,
  isSignedIn = true,
  onRequireLogin,
}: FactCardProps) {
  const { t } = useTranslation('feed');
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const gate = (action?: () => void) => {
    if (!isSignedIn) return onRequireLogin;
    return action;
  };

  const isCollapsible =
    variant !== 'full' &&
    checkIsCollapsible(fact.content, COLLAPSE_LINES, COLLAPSE_THRESHOLD);

  const contentNumberOfLines =
    variant === 'full' || expanded || !isCollapsible ? undefined : COLLAPSE_LINES;

  const titleEl = fact.title ? (
    <ThemedText type="subtitle" numberOfLines={variant === 'full' ? undefined : 2} style={styles.title}>
      {fact.title}
    </ThemedText>
  ) : null;

  const contentEl = fact.content ? (
    <StyledContent
      content={fact.content}
      numberOfLines={contentNumberOfLines}
      enableHashtags
      style={styles.content}
    />
  ) : null;

  const handleAuthorPress = useCallback(() => {
    if (user && fact.author.id === user.id) {
      router.push('/(tabs)/profile');
    } else {
      router.push({ pathname: '/(tabs)/users/[username]', params: { username: fact.author.username } });
    }
  }, [user, fact.author.id, fact.author.username, router]);

  const handleToggleExpand = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    setExpanded((current) => !current);
  }, []);

  return (
    <ThemedView type="backgroundElement" style={[styles.card, Shadows.sm]}>
      <FactCardHeader
        fact={fact}
        variant={variant}
        onAuthorPress={handleAuthorPress}
      />

      {onPress ? (
        <AppPressable onPress={onPress} style={styles.body}>
          {titleEl}
          {contentEl}
        </AppPressable>
      ) : (
        <View>
          {titleEl}
          {contentEl}
        </View>
      )}

      {isCollapsible && (
        <AppPressable onPress={handleToggleExpand} hitSlop={6} style={styles.seeMore}>
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            {expanded ? t('seeLess') : t('seeMore')}
          </ThemedText>
        </AppPressable>
      )}

      {variant !== 'anon' && (
        <LikedByLine
          likes={fact.isRepost ? (fact.likeBy ?? []) : fact.likeBy}
          likesCount={fact.isRepost ? (fact.repostLikeCount ?? 0) : fact.likesCount}
          onPress={gate(fact.isRepost ? onOpenRepostLikes : onOpenLikes)}
        />
      )}

      <FactCardActions
        fact={fact}
        variant={variant}
        isSignedIn={isSignedIn}
        isOwner={isOwner}
        onLike={onLike}
        onRepostLike={onRepostLike}
        onPress={onPress}
        onShare={onShare}
        onRepost={onRepost}
        onEdit={onEdit}
        onDelete={onDelete}
        gate={gate}
      />

      <FactCardCommentPreview
        fact={fact}
        isSignedIn={isSignedIn}
        onPress={onPress}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Radii.md,
    marginBottom: Spacing.two,
  },
  body: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  content: {
    marginBottom: Spacing.two,
    lineHeight: 22,
  },
  seeMore: {
    alignSelf: 'flex-start',
    marginTop: -Spacing.one,
    marginBottom: Spacing.one,
  },
});
