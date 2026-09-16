import { useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppPressable } from '@/shared/ui/app-pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
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
import { FactDetailCard } from './FactDetailCard';
import { FactDiscardCommentModal } from './FactDiscardCommentModal';
import { useFactDetailScreen } from '../hooks/useFactDetailScreen';

export function FactDetailScreen() {
  const { t } = useTranslation(['feed', 'common']);
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopInset();
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    fact,
    loading,
    refreshing,
    isOwner,
    isAuthenticated,
    dateLocale,
    expanded,
    setExpanded,
    overflowVisible,
    setOverflowVisible,
    confirmDeleteVisible,
    setConfirmDeleteVisible,
    confirmDiscardCommentVisible,
    setConfirmDiscardCommentVisible,
    likesModalVisible,
    setLikesModalVisible,
    commentLikesId,
    setCommentLikesId,
    editingComment,
    replyTo,
    setReplyTo,
    setEditingId,
    setComposerHasPending,
    handleRefresh,
    handleConfirmDelete,
    handleAuthorPress,
    handleLike,
    handleRepost,
    handleShare,
    handleBack,
    handleCommentReply,
    handleCommentEdit,
    handleComposerDone,
  } = useFactDetailScreen(id, from);

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
        <FactDetailCard
          fact={fact}
          isOwner={isOwner}
          isAuthenticated={isAuthenticated}
          dateLocale={dateLocale}
          expanded={expanded}
          isCollapsible={isCollapsible}
          overflowVisible={overflowVisible}
          onToggleOverflow={() => setOverflowVisible((v) => !v)}
          onCloseOverflow={() => setOverflowVisible(false)}
          onToggleExpanded={() => setExpanded((current) => !current)}
          onAuthorPress={handleAuthorPress}
          onEdit={() => router.push(`/fact/${fact.id}/edit`)}
          onDelete={() => setConfirmDeleteVisible(true)}
          onOpenLikes={() => (isAuthenticated ? setLikesModalVisible(true) : router.push('/auth/login'))}
          onLike={handleLike}
          onRepost={handleRepost}
          onShare={handleShare}
          onScrollToComments={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Threaded comments */}
        {isAuthenticated && (
          <CommentSection
            factId={fact.id}
            onCommentAuthorPress={(author) => router.push(`/(tabs)/users/${author.username}`)}
            isSignedIn={isAuthenticated}
            onReply={handleCommentReply}
            onEdit={handleCommentEdit}
            onOpenCommentLikes={(cId) => setCommentLikesId(cId)}
          />
        )}
      </ScrollView>

      {/* Fixed bottom comment composer */}
      {isAuthenticated && (
        <CommentComposer
          factId={fact.id}
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

      {/* Delete confirmation */}
      <ConfirmDialog
        visible={confirmDeleteVisible}
        title={t('common:deleteFactTitle')}
        message={t('common:deleteFactMessage')}
        confirmLabel={t('common:delete')}
        cancelLabel={t('common:cancel')}
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteVisible(false)}
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

      {/* Full likes list */}
      <LikesModal
        factId={fact.id}
        visible={likesModalVisible}
        onClose={() => setLikesModalVisible(false)}
      />

      {/* Full comment-likes list */}
      <LikesModal
        factId={fact.id}
        commentId={commentLikesId}
        visible={commentLikesId !== null}
        onClose={() => setCommentLikesId(null)}
      />
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
