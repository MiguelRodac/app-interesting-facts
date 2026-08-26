import { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, TextInput, View, KeyboardAvoidingView, Platform, ActivityIndicator, FlatList, BackHandler, ScrollView } from 'react-native';
import { AppModal } from '@/components/ui/app-modal';
import { AppPressable } from '@/components/ui/app-pressable';
import { useRouter, useSegments } from 'expo-router';

import { CharCounter } from '@/components/CharCounter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UserAvatar } from '@/components/UserAvatar';
import { EmojiPicker, EmojiButton } from '@/components/EmojiPicker';
import { BottomTabInset, Radii, Spacing, MaxContentWidth, Shadows } from '@/constants/theme';
import { useFacts } from '@/data/hooks/useFacts';
import { useAuth } from '@/data/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { useTopInset } from '@/hooks/use-top-inset';
import { createApiClient } from '@/data/api/client';
import { getIdToken } from '@/data/auth/firebaseAuth';
import { useCreateScreenGuard } from '@/data/stores/createScreenGuard';
import { useUIStore } from '@/data/stores/uiStore';
import type { ApiUserSearchResult, ApiHashtag, ApiSearchResponse, ApiUser } from '@/data/api/types';

const client = createApiClient(getIdToken);

const MIN_LENGTH = 10;
const MAX_LENGTH = 1000;
const TITLE_MAX_LENGTH = 50;

const DROPDOWN_BG = '#26262E';
const DROPDOWN_BORDER = '#3A3A46';

export default function CreateFactScreen() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<ApiUserSearchResult[]>([]);
  const [isSearchingMentions, setIsSearchingMentions] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [hashtagQuery, setHashtagQuery] = useState<string | null>(null);
  const [hashtagResults, setHashtagResults] = useState<ApiHashtag[]>([]);
  const [isSearchingHashtags, setIsSearchingHashtags] = useState(false);
  const [showHashtags, setShowHashtags] = useState(false);
  const [selectedHashtagIndex, setSelectedHashtagIndex] = useState(0);
  const cursorPositionRef = useRef(0);
  const previousTextLengthRef = useRef(0);
  const mentionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hashtagTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestMentionQueryRef = useRef('');
  const latestHashtagQueryRef = useRef('');
  const [confirmLeaveVisible, setConfirmLeaveVisible] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { addFact } = useFacts();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const segments = useSegments();
  const hasCheckedAuth = useRef(false);
  const contentInputRef = useRef<TextInput>(null);
  const { setHasUnsavedChanges, clearGuard, formResetCount, hasUnsavedChanges, triggerFormReset } = useCreateScreenGuard();
  const showToast = useUIStore((s) => s.showToast);
  const topInset = useTopInset();

  // Clear the form when the user confirms leaving via the tab guard modal
  useEffect(() => {
    if (formResetCount === 0) return;
    setTitle('');
    setContent('');
    setShowMentions(false);
    setMentionResults([]);
    setShowHashtags(false);
    setHashtagResults([]);
    clearGuard();
  }, [formResetCount, clearGuard]);

  // Redirect to login on initial visit when unauthenticated
  useEffect(() => {
    const isOnAuthScreen = (segments as string[]).includes('auth');

    if (!isAuthenticated && !isOnAuthScreen) {
      if (!hasCheckedAuth.current) {
        hasCheckedAuth.current = true;
        router.replace('/auth/login');
      }
    } else if (isAuthenticated) {
      hasCheckedAuth.current = false;
    }
  }, [isAuthenticated, segments, router]);

  // Cleanup debounce timeouts and reset autocomplete state on unmount
  useEffect(() => {
    return () => {
      if (mentionTimeoutRef.current) {
        clearTimeout(mentionTimeoutRef.current);
      }
      if (hashtagTimeoutRef.current) {
        clearTimeout(hashtagTimeoutRef.current);
      }
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      setShowMentions(false);
      setMentionResults([]);
      setShowHashtags(false);
      setHashtagResults([]);
      clearGuard();
    };
  }, [clearGuard]);

  // Track unsaved changes for tab navigation guard
  useEffect(() => {
    const hasChanges = title.length > 0 || content.length > 0 || showMentions || showHashtags;
    setHasUnsavedChanges(hasChanges);
  }, [title, content, showMentions, showHashtags, setHasUnsavedChanges]);

  // Intercept Android hardware back button — confirm before leaving with unsaved changes
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hasUnsavedChanges) {
        setConfirmLeaveVisible(true);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [hasUnsavedChanges]);

  const searchMentions = useCallback((query: string) => {
    latestMentionQueryRef.current = query;

    // Clear previous timeout
    if (mentionTimeoutRef.current) {
      clearTimeout(mentionTimeoutRef.current);
    }

    if (query.length < 1) {
      setMentionResults([]);
      setShowMentions(false);
      return;
    }

    // Debounce: search after 500ms of inactivity
    mentionTimeoutRef.current = setTimeout(async () => {
      const currentQuery = latestMentionQueryRef.current;
      if (currentQuery.length < 1) {
        setMentionResults([]);
        setShowMentions(false);
        return;
      }

      setIsSearchingMentions(true);
      try {
        const response = await client.get<ApiUserSearchResult[] | { results: ApiUserSearchResult[] }>('/users/search', { q: currentQuery });
        let results = Array.isArray(response) ? response : (response.results ?? []);

        // Usernames may contain dots ("marta.ken"), but the backend search
        // may only match the part before the dot — look up the exact username.
        if (currentQuery.includes('.')) {
          try {
            const exact = await client.get<ApiUser>(`/users/${encodeURIComponent(currentQuery)}`);
            if (exact && exact.username) {
              const exactUser: ApiUserSearchResult = {
                id: exact.id,
                username: exact.username,
                displayName: exact.displayName,
                avatarUrl: exact.avatarUrl ?? null,
                avatarColor: exact.avatarColor,
              };
              results = [exactUser, ...results.filter((r) => r.username !== exactUser.username)];
            }
          } catch {
            // 404 — exact username does not exist; keep search results
          }
        }

        // Keep only results that contain the full typed token
        const normalizedQuery = currentQuery.toLowerCase();
        results = results.filter((r) => r.username.toLowerCase().includes(normalizedQuery));
        setMentionResults(results);
        setSelectedMentionIndex(0);
      } catch {
        setMentionResults([]);
      } finally {
        setIsSearchingMentions(false);
      }
    }, 500);
  }, []);

  const searchHashtags = useCallback((query: string) => {
    latestHashtagQueryRef.current = query;

    // Clear previous timeout
    if (hashtagTimeoutRef.current) {
      clearTimeout(hashtagTimeoutRef.current);
    }

    if (query.length < 1) {
      setHashtagResults([]);
      setShowHashtags(false);
      return;
    }

    // Debounce: search after 500ms of inactivity
    hashtagTimeoutRef.current = setTimeout(async () => {
      const currentQuery = latestHashtagQueryRef.current;
      if (currentQuery.length < 1) {
        setHashtagResults([]);
        setShowHashtags(false);
        return;
      }

      setIsSearchingHashtags(true);
      try {
        const response = await client.get<{ results: ApiHashtag[] }>('/hashtags', { q: currentQuery, limit: '5' });
        setHashtagResults(response.results ?? []);
        setSelectedHashtagIndex(0);
      } catch {
        setHashtagResults([]);
      } finally {
        setIsSearchingHashtags(false);
      }
    }, 500);
  }, []);

  const handleContentChange = useCallback((text: string) => {
    setContent(text);

    // cursorPositionRef is updated in onSelectionChange, which fires AFTER onChangeText.
    // This means when processing a keystroke, the ref still has the OLD cursor position.
    // We detect this by checking if selection.start === selection.end (no selection)
    // and falling back to text.length since cursor is always at end after typing.
    const rawCursorPos = cursorPositionRef.current;
    const cursorPos = (rawCursorPos >= text.length || (rawCursorPos === 0 && text.length > 0) || rawCursorPos === previousTextLengthRef.current)
      ? text.length
      : rawCursorPos;

    previousTextLengthRef.current = text.length;

    // Detect @mention trigger
    const lastAtIndex = text.lastIndexOf('@', cursorPos);
    if (lastAtIndex !== -1) {
      const textAfterAt = text.substring(lastAtIndex + 1, cursorPos);
      // Check if there's a space between @ and cursor (means mention is complete)
      if (!textAfterAt.includes(' ') && textAfterAt.length <= 20) {
        setMentionQuery(textAfterAt);
        setShowMentions(true);
        setShowHashtags(false);

        // Update ref immediately so debounce reads the latest query
        latestMentionQueryRef.current = textAfterAt;
        searchMentions(textAfterAt);
        return;
      }
    }

    // Detect #hashtag trigger
    const lastHashIndex = text.lastIndexOf('#', cursorPos);
    if (lastHashIndex !== -1) {
      const textAfterHash = text.substring(lastHashIndex + 1, cursorPos);
      // Check if there's a space between # and cursor (means hashtag is complete)
      if (!textAfterHash.includes(' ') && textAfterHash.length <= 30) {
        setHashtagQuery(textAfterHash);
        setShowHashtags(true);
        setShowMentions(false);

        // Update ref immediately so debounce reads the latest query
        latestHashtagQueryRef.current = textAfterHash;
        searchHashtags(textAfterHash);
        return;
      }
    }

    setShowMentions(false);
    setMentionQuery(null);
    setMentionResults([]);
    setShowHashtags(false);
    setHashtagQuery(null);
    setHashtagResults([]);
  }, [searchMentions, searchHashtags]);

  const handleSelectionChange = useCallback((event: { nativeEvent: { selection: { start: number; end: number } } }) => {
    cursorPositionRef.current = event.nativeEvent.selection.start;
  }, []);

  // Close the autocomplete dropdowns when the input loses focus. The small
  // delay lets a tap on a suggestion row register first (the rows use
  // keyboardShouldPersistTaps="handled").
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleContentBlur = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = setTimeout(() => {
      setShowMentions(false);
      setMentionResults([]);
      setShowHashtags(false);
      setHashtagResults([]);
    }, 150);
  }, []);

  const handleSelectMention = useCallback((user: ApiUserSearchResult) => {
    const lastAtIndex = content.lastIndexOf('@', cursorPositionRef.current);
    if (lastAtIndex === -1) return;

    const beforeAt = content.substring(0, lastAtIndex);
    const afterCursor = content.substring(cursorPositionRef.current);
    const newContent = `${beforeAt}@${user.username} ${afterCursor}`;

    setContent(newContent);
    setShowMentions(false);
    setMentionQuery(null);
    setMentionResults([]);

    // Focus back on input
    contentInputRef.current?.focus();
  }, [content]);

  const handleSelectHashtag = useCallback((hashtag: ApiHashtag) => {
    const lastHashIndex = content.lastIndexOf('#', cursorPositionRef.current);
    if (lastHashIndex === -1) return;

    const beforeHash = content.substring(0, lastHashIndex);
    const afterCursor = content.substring(cursorPositionRef.current);
    const newContent = `${beforeHash}#${hashtag.tag} ${afterCursor}`;

    setContent(newContent);
    setShowHashtags(false);
    setHashtagQuery(null);
    setHashtagResults([]);

    // Focus back on input
    contentInputRef.current?.focus();
  }, [content]);

  // Emoji picker.
  const handleEmojiSelected = useCallback(
    (emoji: string) => {
      setContent((prev) => prev + emoji);
      requestAnimationFrame(() => contentInputRef.current?.focus());
    },
    [],
  );

  // Show loading while checking auth
  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  const isValid = content.trim().length >= MIN_LENGTH && content.trim().length <= MAX_LENGTH;

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addFact({
        title: title.trim() || undefined,
        content: content.trim(),
      });
      setTitle('');
      setContent('');
      clearGuard();
      showToast('Your fact has been shared!', 'success');
      router.navigate('/(tabs)');
    } catch {
      // Error is handled by uiStore → ErrorBanner
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setContent('');
    clearGuard();
    router.navigate('/(tabs)');
  };

  const handleConfirmLeave = () => {
    setConfirmLeaveVisible(false);
    triggerFormReset();
    clearGuard();
    router.navigate('/(tabs)');
  };

  const handleCancelLeave = () => {
    setConfirmLeaveVisible(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: topInset }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="subtitle">Create Fact</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Share something interesting with the world
            </ThemedText>
          </View>

          {/* Form */}
          <View style={styles.form}>
          {/* Title field */}
          <View style={styles.field}>
            <View style={styles.fieldHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Title (optional)
              </ThemedText>
              <CharCounter current={title.length} min={0} max={TITLE_MAX_LENGTH} />
            </View>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundElement,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Give your fact a title..."
              placeholderTextColor={theme.muted}
              value={title}
              onChangeText={setTitle}
              maxLength={TITLE_MAX_LENGTH}
              editable={!isSubmitting}
            />
          </View>

          {/* Content field */}
          <View style={styles.field}>
            <View style={styles.fieldHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Content
              </ThemedText>
              <View style={styles.fieldHeaderRight}>
                <EmojiButton onPress={() => setShowEmojiPicker((v) => !v)} active={showEmojiPicker} />
                <CharCounter current={content.trim().length} min={MIN_LENGTH} max={MAX_LENGTH} />
              </View>
            </View>
            <View style={styles.contentContainer}>
              <TextInput
                ref={contentInputRef}
                style={[
                  styles.textarea,
                  {
                    backgroundColor: theme.backgroundElement,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Share a fact you find interesting... Use @ to mention users"
                placeholderTextColor={theme.muted}
                value={content}
                onChangeText={handleContentChange}
                onSelectionChange={handleSelectionChange}
                onBlur={handleContentBlur}
                maxLength={MAX_LENGTH}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isSubmitting}
              />

              {/* Mention autocomplete dropdown */}
              {showMentions && (
                <View style={[styles.autocompleteDropdown, { backgroundColor: DROPDOWN_BG, borderColor: DROPDOWN_BORDER }]}>
                  {isSearchingMentions ? (
                    <View style={styles.autocompleteLoading}>
                      <ActivityIndicator size="small" color={theme.muted} />
                    </View>
                  ) : mentionResults.length === 0 ? (
                    <View style={styles.autocompleteLoading}>
                      <ThemedText type="small" style={styles.autocompleteEmptyText}>No users found</ThemedText>
                    </View>
                  ) : (
                    <FlatList
                      data={mentionResults}
                      keyExtractor={(item) => item.username}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item, index }) => (
                        <AppPressable
                          style={[
                            styles.autocompleteItem,
                            index === selectedMentionIndex && styles.autocompleteItemSelected,
                          ]}
                          onPress={() => handleSelectMention(item)}
                          onPressIn={() => setSelectedMentionIndex(index)}>
                          <UserAvatar
                            user={{ displayName: item.displayName, avatarColor: item.avatarColor ?? '#64B5F6', avatarUrl: item.avatarUrl }}
                            size={30}
                          />
                          <View style={styles.autocompleteInfo}>
                            <ThemedText type="smallBold" style={styles.autocompleteName}>
                              {item.username}
                            </ThemedText>
                            <ThemedText type="small" style={styles.autocompleteSubtext}>
                              {item.displayName}
                            </ThemedText>
                          </View>
                        </AppPressable>
                      )}
                    />
                  )}
                </View>
              )}

              {/* Hashtag autocomplete dropdown */}
              {showHashtags && (
                <View style={[styles.autocompleteDropdown, { backgroundColor: DROPDOWN_BG, borderColor: DROPDOWN_BORDER }]}>
                  {isSearchingHashtags ? (
                    <View style={styles.autocompleteLoading}>
                      <ActivityIndicator size="small" color={theme.muted} />
                    </View>
                  ) : hashtagResults.length === 0 ? (
                    <View style={styles.autocompleteLoading}>
                      <ThemedText type="small" style={styles.autocompleteEmptyText}>No hashtags found</ThemedText>
                    </View>
                  ) : (
                    <FlatList
                      data={hashtagResults}
                      keyExtractor={(item) => item.id}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item, index }) => (
                        <AppPressable
                          style={[
                            styles.autocompleteItem,
                            index === selectedHashtagIndex && styles.autocompleteItemSelected,
                          ]}
                          onPress={() => handleSelectHashtag(item)}
                          onPressIn={() => setSelectedHashtagIndex(index)}>
                          <View style={styles.hashtagIcon}>
                            <ThemedText type="smallBold" style={styles.hashtagIconText}>#</ThemedText>
                          </View>
                          <View style={styles.autocompleteInfo}>
                            <ThemedText type="smallBold" style={styles.autocompleteName}>
                              {item.tag}
                            </ThemedText>
                          </View>
                        </AppPressable>
                      )}
                    />
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <AppPressable
              onPress={handleCancel}
              disabled={isSubmitting}
              hitSlop={6}
              style={[
                styles.button,
                styles.cancelButton,
                { borderColor: theme.border },
              ]}>
              <ThemedText type="smallBold" style={styles.cancelText}>
                Cancel
              </ThemedText>
            </AppPressable>
            <AppPressable
              onPress={isValid && !isSubmitting ? handleSubmit : undefined}
              disabled={!isValid || isSubmitting}
              hitSlop={6}
              style={[
                styles.button,
                styles.submitButton,
                {
                  backgroundColor: isValid ? theme.primary : theme.muted,
                  opacity: isSubmitting ? 0.7 : 1,
                },
              ]}>
              <ThemedText type="smallBold" style={styles.submitText}>
                {isSubmitting ? 'Sharing...' : 'Share Fact'}
              </ThemedText>
            </AppPressable>
          </View>
        </View>
      </ScrollView>
    </ThemedView>

    <EmojiPicker
      visible={showEmojiPicker}
      onClose={() => setShowEmojiPicker(false)}
      onSelect={handleEmojiSelected}
    />

    {/* Unsaved changes confirmation modal (Android hardware back) */}
    <AppModal visible={confirmLeaveVisible} transparent animationType="fade" onRequestClose={handleCancelLeave}>
      <View style={styles.modalOverlay}>
        <ThemedView type="backgroundElement" style={styles.modalContent}>
          <ThemedText type="subtitle" style={styles.modalTitle}>
            ¿Perder los cambios?
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.modalMessage}>
            Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?
          </ThemedText>
          <View style={styles.modalButtons}>
            <AppPressable
              onPress={handleCancelLeave}
              style={[styles.modalButton, styles.cancelModalButton, { borderColor: theme.border }]}>
              <ThemedText type="smallBold" style={styles.cancelModalText}>
                Cancelar
              </ThemedText>
            </AppPressable>
            <AppPressable
              onPress={handleConfirmLeave}
              style={[styles.modalButton, styles.confirmModalButton, { backgroundColor: theme.destructive }]}>
              <ThemedText type="smallBold" style={styles.confirmModalText}>
                Salir
              </ThemedText>
            </AppPressable>
          </View>
        </ThemedView>
      </View>
    </AppModal>
  </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.one,
  },
  form: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  field: {
    gap: Spacing.two,
    position: 'relative',
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  contentContainer: {
    position: 'relative',
  },
  textarea: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 120,
  },
  // Instagram-style autocomplete dropdown — dark, anchored ABOVE the textarea
  autocompleteDropdown: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    maxHeight: 240,
    marginBottom: Spacing.one,
    borderRadius: Radii.lg,
    borderWidth: 1,
    zIndex: 1000,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  autocompleteLoading: {
    padding: Spacing.three,
    alignItems: 'center',
  },
  autocompleteEmptyText: {
    color: '#B0B0C0',
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three + 2,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two + 4,
  },
  autocompleteItemSelected: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  autocompleteInfo: {
    flex: 1,
    gap: 1,
  },
  autocompleteName: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  autocompleteSubtext: {
    fontSize: 12,
    color: '#A0A0B0',
  },
  hashtagIcon: {
    width: 30,
    height: 30,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  hashtagIconText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.three + 1,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelText: {
    opacity: 0.7,
  },
  submitButton: {},
  submitText: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
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
