import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View, Pressable, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { FactCard } from '@/components/FactCard';
import { UserAvatar } from '@/components/UserAvatar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/data/hooks/useAuth';
import { useLikedFacts } from '@/data/hooks/useLikedFacts';
import { useFactsStore } from '@/data/stores/factsStore';
import { useTheme } from '@/hooks/use-theme';
import { useThemeContext } from '@/hooks/theme-provider';
import type { Fact } from '@/types';

type ProfileTab = 'mine' | 'liked';

export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuth();
  const userFacts = useFactsStore((s) => s.userFacts);
  const userFactsLoading = useFactsStore((s) => s.userFactsLoading);
  const fetchUserFacts = useFactsStore((s) => s.fetchUserFacts);
  const toggleLike = useFactsStore((s) => s.toggleLike);
  const { likedFacts } = useLikedFacts();
  const userFactsCount = useFactsStore((s) => s.userFacts.length);
  const [activeTab, setActiveTab] = useState<ProfileTab>('mine');
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const router = useRouter();
  const theme = useTheme();
  const { colorScheme, toggleDarkMode } = useThemeContext();

  // Fetch fresh user facts every time the profile gains focus (create/edit/delete happen elsewhere)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchUserFacts(user.id, userFactsCount > 0);
      }
    }, [user?.id, fetchUserFacts, userFactsCount]),
  );

  const displayedFacts = activeTab === 'mine' ? userFacts : likedFacts;

  const handleFactPress = useCallback(
    (fact: Fact) => {
      router.push(`/fact/${fact.id}?from=profile`);
    },
    [router],
  );

  const handleLike = useCallback(
    (factId: string) => {
      toggleLike(factId);
    },
    [toggleLike],
  );

  const handleLogout = useCallback(() => {
    setLogoutModalVisible(true);
  }, []);

  const handleConfirmLogout = useCallback(async () => {
    setLogoutModalVisible(false);
    await logout();
    router.replace('/auth/login');
  }, [logout, router]);

  const handleCancelLogout = useCallback(() => {
    setLogoutModalVisible(false);
  }, []);

  const handleEditProfile = useCallback(() => {
    router.push('/edit-profile');
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: Fact }) => (
      <FactCard
        fact={item}
        variant="preview"
        onPress={() => handleFactPress(item)}
        onLike={() => handleLike(item.id)}
      />
    ),
    [handleFactPress, handleLike],
  );

  const renderEmpty = useCallback(() => {
    if (activeTab === 'mine' && userFactsLoading) {
      return <LoadingSkeleton count={3} />;
    }
    if (activeTab === 'mine') {
      return <EmptyState title="No facts yet" subtitle="Your created facts will appear here" icon="create-outline" />;
    }
    return <EmptyState title="No liked facts" subtitle="Facts you like will appear here" icon="heart-outline" />;
  }, [activeTab, userFactsLoading]);

  if (!isAuthenticated || !user) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.loginPrompt}>
          <Ionicons name="person-circle-outline" size={80} color={theme.primary} />
          <ThemedText type="subtitle" style={styles.loginTitle}>
            Sign in to view your profile
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.loginSubtitle}>
            Create facts, save your favorites, and more
          </ThemedText>
          <Pressable
            style={[styles.loginButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/auth/login')}>
            <ThemedText type="small" style={styles.loginButtonText}>
              Sign In
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.registerButton, { borderColor: theme.border }]}
            onPress={() => router.push('/auth/register')}>
            <ThemedText type="small" style={{ color: theme.text }}>
              Create Account
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarSection}>
          <UserAvatar user={user} size={80} />
          <View style={styles.userInfo}>
            <ThemedText type="subtitle">{user.displayName}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              @{user.username}
            </ThemedText>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Pressable onPress={toggleDarkMode} style={[styles.actionButton, { borderColor: theme.border }]}>
            <Ionicons
              name={colorScheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
              size={18}
              color={theme.primary}
            />
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              {colorScheme === 'dark' ? 'Light' : 'Dark'}
            </ThemedText>
          </Pressable>
          <Pressable onPress={handleEditProfile} style={[styles.actionButton, { borderColor: theme.border }]}>
            <Ionicons name="create-outline" size={18} color={theme.primary} />
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              Edit Profile
            </ThemedText>
          </Pressable>
          <Pressable onPress={handleLogout} style={[styles.actionButton, { borderColor: theme.destructive }]}>
            <Ionicons name="log-out-outline" size={18} color={theme.destructive} />
            <ThemedText type="smallBold" style={{ color: theme.destructive }}>
              Logout
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Tab switcher */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => setActiveTab('mine')}
          style={[styles.tab, activeTab === 'mine' && { borderBottomColor: theme.primary }]}>
          <ThemedText
            type="smallBold"
            style={{ color: activeTab === 'mine' ? theme.primary : theme.muted }}>
            My Facts ({userFacts.length})
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('liked')}
          style={[styles.tab, activeTab === 'liked' && { borderBottomColor: theme.primary }]}>
          <ThemedText
            type="smallBold"
            style={{ color: activeTab === 'liked' ? theme.primary : theme.muted }}>
            Liked ({likedFacts.length})
          </ThemedText>
        </Pressable>
      </View>

      {/* Facts list */}
      <FlatList
        data={displayedFacts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      {/* Logout confirmation modal */}
      <Modal visible={logoutModalVisible} transparent animationType="fade" onRequestClose={handleCancelLogout}>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalContent}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              ¿Salir de la sesión?
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.modalMessage}>
              ¿Seguro que quieres cerrar tu sesión?
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable
                onPress={handleCancelLogout}
                style={[styles.modalButton, styles.cancelModalButton, { borderColor: theme.border }]}>
                <ThemedText type="smallBold" style={styles.cancelModalText}>
                  Cancelar
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleConfirmLogout}
                style={[styles.modalButton, styles.confirmModalButton, { backgroundColor: theme.destructive }]}>
                <ThemedText type="smallBold" style={styles.confirmModalText}>
                  Salir
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  userInfo: {
    gap: Spacing.half,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.four,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  loginPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  loginTitle: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  loginSubtitle: {
    textAlign: 'center',
    maxWidth: 250,
  },
  loginButton: {
    paddingHorizontal: Spacing.six,
    paddingVertical: Spacing.two,
    borderRadius: Radii.md,
    minWidth: 150,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  loginButtonText: {
    color: '#ffffff',
  },
  registerButton: {
    paddingHorizontal: Spacing.six,
    paddingVertical: Spacing.two,
    borderRadius: Radii.md,
    borderWidth: 1,
    minWidth: 150,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radii.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  modalTitle: {
    textAlign: 'center',
  },
  modalMessage: {
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalButton: {
    borderWidth: 1,
  },
  cancelModalText: {
    opacity: 0.7,
  },
  confirmModalButton: {},
  confirmModalText: {
    color: '#FFFFFF',
  },
});
