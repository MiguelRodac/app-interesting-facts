import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { AppModal } from '@/components/ui/app-modal';
import { AppPressable } from '@/components/ui/app-pressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { UserAvatar } from '@/components/UserAvatar';
import { Radii, Spacing } from '@/constants/theme';
import { useFactLikes } from '@/data/hooks/useFactLikes';
import { useCommentLikes } from '@/data/hooks/useCommentLikes';
import { useRepostLikes } from '@/data/hooks/useRepostLikes';
import { useRepostCommentLikes } from '@/data/hooks/useRepostCommentLikes';
import { useAuth } from '@/data/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import type { ApiFactLike } from '@/data/api/types';

interface LikesModalProps {
  factId?: string | null;
  /** If provided, fetches comment likes instead of fact likes. */
  commentId?: string | null;
  /** If provided, fetches repost likes instead of fact likes. */
  repostId?: string | null;
  /** If provided with repostId, fetches repost comment likes. */
  repostCommentId?: string | null;
  visible: boolean;
  onClose: () => void;
}

/**
 * Reusable likes modal — shows who liked a fact, comment, repost, or
 * repost comment. Pass `commentId` for fact comment likes, `repostId`
 * for repost likes, or `repostCommentId` for repost comment likes.
 */
export function LikesModal({ factId, commentId, repostId, repostCommentId, visible, onClose }: LikesModalProps) {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const factLikes = useFactLikes(commentId ? null : factId, visible && !commentId && !repostId && !repostCommentId);
  const commentLikes = useCommentLikes(factId, commentId ?? null, visible && !!commentId);
  const repostLikes = useRepostLikes(repostId ?? null, visible && !!repostId && !repostCommentId);
  const repostCommentLikes = useRepostCommentLikes(repostId ?? null, repostCommentId ?? null, visible && !!repostCommentId);

  const { likes, refetch } = repostCommentId
    ? repostCommentLikes
    : repostId
      ? repostLikes
      : commentId
        ? commentLikes
        : factLikes;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && (factId || repostId)) {
      setLoading(true);
      refetch().finally(() => setLoading(false));
    }
  }, [visible, factId, repostId, refetch]);

  const handleUserPress = useCallback(
    (like: ApiFactLike) => {
      if (user && user.username === like.username) {
        router.push('/(tabs)/profile');
      } else {
        router.push({ pathname: '/(tabs)/users/[username]', params: { username: like.username } });
      }
      onClose();
    },
    [user, router, onClose],
  );

  return (
    <AppModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <AppPressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={[styles.handle, { backgroundColor: theme.muted }]} />
          {loading && likes.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <ThemedText type="small" themeColor="textSecondary">{t('common:likes')}</ThemedText>
                <View style={styles.counterRow}>
                  <Ionicons name="heart" size={28} color={theme.destructive} />
                  <ThemedText type="default" style={styles.counterNumber}>{likes.length}</ThemedText>
                </View>
              </View>
              <FlatList
                data={likes}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.centerEmpty}>
                    <ThemedText type="small" themeColor="textSecondary">{t('common:noLikesYet')}</ThemedText>
                  </View>
                }
                renderItem={({ item }) => (
                  <AppPressable
                    onPress={() => handleUserPress(item)}
                    style={[styles.userRow, { borderBottomColor: theme.border }]}>
                    <UserAvatar user={item} size={40} />
                    <View style={styles.userInfo}>
                      <ThemedText type="smallBold" numberOfLines={1}>{item.displayName}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">@{item.username}</ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.muted} />
                  </AppPressable>
                )}
              />
            </>
          )}
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingTop: Spacing.two,
    maxHeight: '75%',
    minHeight: 200,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.three,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  counterNumber: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  center: {
    paddingVertical: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
});
