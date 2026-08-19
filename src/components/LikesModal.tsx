import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { AppModal } from '@/components/ui/app-modal';
import { AppPressable } from '@/components/ui/app-pressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { LikedByLine } from '@/components/LikedByLine';
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
        <AppPressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <ThemedView type="backgroundElement" style={styles.sheet}>
          <AppPressable style={StyleSheet.absoluteFill} onPress={() => {}} />
          <View style={styles.handle} />
          <View style={styles.header}>
            <ThemedText type="subtitle">Likes</ThemedText>
            {likes.length > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                {likes.length}
              </ThemedText>
            )}
          </View>

          {loading && likes.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : (
            <FlatList
              data={likes}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.center}>
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
        </ThemedView>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#999',
    alignSelf: 'center',
    marginBottom: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  center: {
    paddingVertical: Spacing.five,
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.four,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
});