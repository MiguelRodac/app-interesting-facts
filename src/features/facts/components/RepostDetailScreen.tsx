import { useRef } from 'react';
import { StyleSheet, ScrollView, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { AppPressable } from '@/shared/ui/app-pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LikesModal } from './LikesModal';
import { LoadingSkeleton } from '@/shared/ui/LoadingSkeleton';
import { CommentComposer, CommentSection } from '@/features/comments';
import { TabBar } from '@/shared/ui/TabBar';
import { ThemedView } from '@/shared/ui/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { COLLAPSE_LINES_DETAIL, COLLAPSE_THRESHOLD_DETAIL, checkIsCollapsible } from '@/constants/facts';
import { useTheme } from '@/shared/hooks/use-theme';
import { useTopInset } from '@/shared/hooks/use-top-inset';
import { RepostDetailCard } from './RepostDetailCard';
import { FactDiscardCommentModal } from './FactDiscardCommentModal';
import { useRepostDetailScreen } from '../hooks/useRepostDetailScreen';

export function RepostDetailScreen() {
  const { t } = useTranslation(['feed', 'common']);
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const theme = useTheme();
  const topInset = useTopInset();

  const {
    fact,
    repostEntryId,
    loading,
    refreshing,
    isAuthenticated,
    dateLocale,
    user,
    expanded,
    setExpanded,
    likesModalVisible,
    setLikesModalVisible,
    commentLikesId,
    setCommentLikesId,
    editingComment,
    replyTo,
    setReplyTo,
    setEditingId,
    confirmDiscardCommentVisible,
    setConfirmDiscardCommentVisible,
    setComposerHasPending,
    handleRefresh,
    handleAuthorPress,
    handleCommentAuthorPress,
    handleRepostLike,
    handleRepost,
    handleShare,
    handleBack,
    handleCommentReply,
    handleCommentEdit,
    handleComposerDone,
  } = useRepostDetailScreen(id, from);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <LoadingSkeleton count={1} />
      </ThemedView>
    );
  }

  if (!fact) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState title={t('common:factNotFound')} subtitle={t('common:factNotFoundSubtitle')} icon="alert-circle-outline" />
      </ThemedView>
    );
  }

  const isCollapsible = checkIsCollapsible(fact.content, COLLAPSE_LINES_DETAIL, COLLAPSE_THRESHOLD_DETAIL);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.scroll, { paddingTop: topInset }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }>
        {/* Back button */}
        <AppPressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </AppPressable>

        {/* Fact detail card */}
        <RepostDetailCard
          fact={fact}
          user={user}
          isAuthenticated={isAuthenticated}
          dateLocale={dateLocale}
          expanded={expanded}
          isCollapsible={isCollapsible}
          onToggleExpanded={() => setExpanded((current) => !current)}
          onAuthorPress={handleAuthorPress}
          onOpenLikes={() => (isAuthenticated ? setLikesModalVisible(true) : router.push('/auth/login'))}
          onRepostLike={handleRepostLike}
          onRepost={handleRepost}
          onShare={handleShare}
          onScrollToComments={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Repost comments */}
        {isAuthenticated && repostEntryId && (
          <CommentSection
            repostEntryId={repostEntryId}
            onCommentAuthorPress={handleCommentAuthorPress}
            isSignedIn={isAuthenticated}
            onReply={handleCommentReply}
            onEdit={handleCommentEdit}
            onOpenCommentLikes={(commentId) => setCommentLikesId(commentId)}
          />
        )}
      </ScrollView>

      {/* Fixed bottom comment composer */}
      {isAuthenticated && repostEntryId && (
        <CommentComposer
          repostEntryId={repostEntryId}
          mode={editingComment ? 'edit' : 'create'}
          commentId={editingComment?.id}
          initialValue={editingComment?.content ?? ''}
          replyTo={editingComment ? null : replyTo}
          onCancelReply={() => setReplyTo(null)}
          onCancelEdit={() => setEditingId(null)}
          onDone={handleComposerDone}
          onPendingTextChange={setComposerHasPending}
        />
      )}

      {/* Bottom tab bar */}
      <TabBar
        activeTab="feed"
        onTabPress={(tab) => {
          if (tab === 'feed') router.replace('/(tabs)');
          else if (tab === 'search') router.replace('/(tabs)/search');
          else if (tab === 'create') router.replace('/(tabs)/create');
          else if (tab === 'profile') router.replace('/(tabs)/profile');
        }}
      />

      {/* Discard draft dialog */}
      <FactDiscardCommentModal
        visible={confirmDiscardCommentVisible}
        onKeepEditing={() => setConfirmDiscardCommentVisible(false)}
        onDiscard={() => {
          setConfirmDiscardCommentVisible(false);
          setComposerHasPending(false);
          handleBack();
        }}
      />

      {/* Full likes list for the original fact */}
      {user && (
        <LikesModal
          factId={fact.originalFactId ?? fact.id}
          visible={likesModalVisible}
          onClose={() => setLikesModalVisible(false)}
        />
      )}

      {/* Full comment-likes list for a repost comment */}
      {user && repostEntryId && (
        <LikesModal
          factId={fact.originalFactId ?? fact.id}
          repostId={repostEntryId}
          commentId={commentLikesId}
          visible={commentLikesId !== null}
          onClose={() => setCommentLikesId(null)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    marginBottom: Spacing.three,
    padding: Spacing.one,
    alignSelf: 'flex-start',
  },
});
