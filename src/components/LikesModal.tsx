import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { AppModal } from '@/components/ui/app-modal';
import { AppPressable } from '@/components/ui/app-pressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UserAvatar } from '@/components/UserAvatar';
import { Radii, Spacing } from '@/constants/theme';
import { useFactLikes } from '@/data/hooks/useFactLikes';
import { useAuth } from '@/data/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import type { ApiFactLike } from '@/data/api/types';

interface LikesModalProps {
  factId: string | null;
  visible: boolean;
  onClose: () => void;
}

/** Bottom sheet with the full list of users who liked a fact */
export function LikesModal({ factId, visible, onClose }: LikesModalProps) {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { likes, refetch } = useFactLikes(factId, visible);
  const [loading, setLoading] = useState(false);

  // Fresh data every time the modal opens
  useEffect(() => {
    if (visible && factId) {
      setLoading(true);
      refetch();
    }
  }, [visible, factId, refetch]);

  // When likes arrive we can stop loading
  useEffect(() => {
    if (!visible) return;
    setLoading(false);
  }, [likes, visible]);

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
        {/* Tap outside to close */}
        <AppPressable style={styles.backdrop} onPress={onClose} />

        {/* Sheet — absolute positioned at bottom, fixed height via percentages */}
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          {/* Drag handle */}
          <View style={[styles.handle, { backgroundColor: theme.muted }]} />

          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="small" themeColor="textSecondary">
              Likes
            </ThemedText>
            <View style={styles.counterRow}>
              <Ionicons name="heart" size={28} color={theme.destructive} />
              <ThemedText type="default" style={styles.counterNumber}>
                {likes.length}
              </ThemedText>
            </View>
          </View>

          {loading && likes.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : (
            <FlatList
              data={likes}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.centerEmpty}>
                  <ThemedText type="small" themeColor="textSecondary">
                    No likes yet
                  </ThemedText>
                </View>
              }
              renderItem={({ item }) => (
                <AppPressable
                  onPress={() => handleUserPress(item)}
                  style={[styles.userRow, { borderBottomColor: theme.border }]}>
                  <UserAvatar user={item} size={40} />
                  <View style={styles.userInfo}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {item.displayName}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      @{item.username}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.muted} />
                </AppPressable>
              )}
            />
          )}
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
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
    flexShrink: 0,
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
