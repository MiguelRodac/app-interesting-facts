import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CharCounter } from '@/components/CharCounter';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UserAvatar } from '@/components/UserAvatar';
import { Radii, Spacing, MaxContentWidth, Shadows } from '@/constants/theme';
import { useFactsStore } from '@/data/stores/factsStore';
import { useTheme } from '@/hooks/use-theme';
import { createApiClient } from '@/data/api/client';
import { getIdToken } from '@/data/auth/firebaseAuth';
import type { ApiUserSearchResult, ApiHashtag } from '@/data/api/types';
import type { Fact } from '@/types';

const client = createApiClient(getIdToken);

const MIN_LENGTH = 10;
const MAX_LENGTH = 200;

export default function EditFactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();

  const facts = useFactsStore((s) => s.facts);
  const userFacts = useFactsStore((s) => s.userFacts);
  const updateFact = useFactsStore((s) => s.updateFact);

  const [fact, setFact] = useState<Fact | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mention/hashtag autocomplete state
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
  const contentInputRef = useRef<TextInput>(null);

  // Find fact from store
  useEffect(() => {
    if (!id) return;
    const found = facts.find((f) => f.id === id) ?? userFacts.find((f) => f.id === id);
    if (found) {
      setFact(found);
      setTitle(found.title ?? '');
      setContent(found.content);
    }
    setLoading(false);
  }, [id, facts, userFacts]);

  // Cleanup debounce timeouts on unmount
  useEffect(() => {
    return () => {
      if (mentionTimeoutRef.current) clearTimeout(mentionTimeoutRef.current);
      if (hashtagTimeoutRef.current) clearTimeout(hashtagTimeoutRef.current);
    };
  }, []);

  const searchMentions = useCallback((query: string) => {
    latestMentionQueryRef.current = query;
    if (mentionTimeoutRef.current) clearTimeout(mentionTimeoutRef.current);

    if (query.length < 1) {
      setMentionResults([]);
      setShowMentions(false);
      return;
    }

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
        setMentionResults(Array.isArray(response) ? response : (response.results ?? []));
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
    if (hashtagTimeoutRef.current) clearTimeout(hashtagTimeoutRef.current);

    if (query.length < 1) {
      setHashtagResults([]);
      setShowHashtags(false);
      return;
    }

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

    const rawCursorPos = cursorPositionRef.current;
    const cursorPos = (rawCursorPos >= text.length || (rawCursorPos === 0 && text.length > 0) || rawCursorPos === previousTextLengthRef.current)
      ? text.length
      : rawCursorPos;
    previousTextLengthRef.current = text.length;

    // Detect @mention trigger
    const lastAtIndex = text.lastIndexOf('@', cursorPos);
    if (lastAtIndex !== -1) {
      const textAfterAt = text.substring(lastAtIndex + 1, cursorPos);
      if (!textAfterAt.includes(' ') && textAfterAt.length <= 20) {
        setMentionQuery(textAfterAt);
        setShowMentions(true);
        setShowHashtags(false);
        latestMentionQueryRef.current = textAfterAt;
        searchMentions(textAfterAt);
        return;
      }
    }

    // Detect #hashtag trigger
    const lastHashIndex = text.lastIndexOf('#', cursorPos);
    if (lastHashIndex !== -1) {
      const textAfterHash = text.substring(lastHashIndex + 1, cursorPos);
      if (!textAfterHash.includes(' ') && textAfterHash.length <= 30) {
        setHashtagQuery(textAfterHash);
        setShowHashtags(true);
        setShowMentions(false);
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

  const handleSelectMention = useCallback((user: ApiUserSearchResult) => {
    const lastAtIndex = content.lastIndexOf('@', cursorPositionRef.current);
    if (lastAtIndex === -1) return;
    const beforeAt = content.substring(0, lastAtIndex);
    const afterCursor = content.substring(cursorPositionRef.current);
    setContent(`${beforeAt}@${user.username} ${afterCursor}`);
    setShowMentions(false);
    setMentionQuery(null);
    setMentionResults([]);
    contentInputRef.current?.focus();
  }, [content]);

  const handleSelectHashtag = useCallback((hashtag: ApiHashtag) => {
    const lastHashIndex = content.lastIndexOf('#', cursorPositionRef.current);
    if (lastHashIndex === -1) return;
    const beforeHash = content.substring(0, lastHashIndex);
    const afterCursor = content.substring(cursorPositionRef.current);
    setContent(`${beforeHash}#${hashtag.tag} ${afterCursor}`);
    setShowHashtags(false);
    setHashtagQuery(null);
    setHashtagResults([]);
    contentInputRef.current?.focus();
  }, [content]);

  const isValid = content.trim().length >= MIN_LENGTH && content.trim().length <= MAX_LENGTH;
  const hasChanges =
    fact !== null &&
    (title.trim() !== (fact.title ?? '') || content.trim() !== fact.content);

  const handleSubmit = useCallback(async () => {
    if (!isValid || isSubmitting || !fact || !hasChanges) return;

    setIsSubmitting(true);
    try {
      await updateFact(fact.id, {
        title: title.trim() || undefined,
        content: content.trim(),
      });
      router.replace(`/fact/${fact.id}`);
    } catch {
      // Error is handled by uiStore → ErrorBanner
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, isSubmitting, fact, hasChanges, title, content, updateFact, router]);

  const handleCancel = useCallback(() => {
    if (fact) {
      router.navigate(`/fact/${fact.id}`);
    }
  }, [router, fact]);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  if (!fact) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="default" themeColor="textSecondary">
          Fact not found
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleCancel} hitSlop={8} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerContent}>
            <ThemedText type="subtitle">Edit Fact</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Update your fact
            </ThemedText>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Title field */}
          <View style={styles.field}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Title (optional)
            </ThemedText>
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
              maxLength={100}
              editable={!isSubmitting}
            />
          </View>

          {/* Content field */}
          <View style={styles.field}>
            <View style={styles.fieldHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Content
              </ThemedText>
              <CharCounter current={content.trim().length} min={MIN_LENGTH} max={MAX_LENGTH} />
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
                maxLength={MAX_LENGTH}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isSubmitting}
              />

              {/* Mention autocomplete dropdown */}
              {showMentions && (
                <View style={[styles.autocompleteDropdown, { backgroundColor: theme.backgroundElement }]}>
                  {isSearchingMentions ? (
                    <View style={styles.autocompleteLoading}>
                      <ActivityIndicator size="small" color={theme.muted} />
                    </View>
                  ) : mentionResults.length === 0 ? (
                    <View style={styles.autocompleteLoading}>
                      <ThemedText type="small" themeColor="muted">No users found</ThemedText>
                    </View>
                  ) : (
                    <FlatList
                      data={mentionResults}
                      keyExtractor={(item) => item.username}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item, index }) => (
                        <Pressable
                          style={[
                            styles.autocompleteItem,
                            index === selectedMentionIndex && { backgroundColor: theme.backgroundSelected },
                          ]}
                          onPress={() => handleSelectMention(item)}
                          onPressIn={() => setSelectedMentionIndex(index)}>
                          <UserAvatar
                            user={{ displayName: item.displayName, avatarColor: item.avatarColor ?? '#64B5F6', avatarUrl: item.avatarUrl }}
                            size={30}
                          />
                          <View style={styles.autocompleteInfo}>
                            <ThemedText type="smallBold" style={[styles.autocompleteName, { color: theme.text }]}>
                              {item.username}
                            </ThemedText>
                            <ThemedText type="small" style={[styles.autocompleteSubtext, { color: theme.textSecondary }]}>
                              {item.displayName}
                            </ThemedText>
                          </View>
                        </Pressable>
                      )}
                    />
                  )}
                </View>
              )}

              {/* Hashtag autocomplete dropdown */}
              {showHashtags && (
                <View style={[styles.autocompleteDropdown, { backgroundColor: theme.backgroundElement }]}>
                  {isSearchingHashtags ? (
                    <View style={styles.autocompleteLoading}>
                      <ActivityIndicator size="small" color={theme.muted} />
                    </View>
                  ) : hashtagResults.length === 0 ? (
                    <View style={styles.autocompleteLoading}>
                      <ThemedText type="small" themeColor="muted">No hashtags found</ThemedText>
                    </View>
                  ) : (
                    <FlatList
                      data={hashtagResults}
                      keyExtractor={(item) => item.id}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item, index }) => (
                        <Pressable
                          style={[
                            styles.autocompleteItem,
                            index === selectedHashtagIndex && { backgroundColor: theme.backgroundSelected },
                          ]}
                          onPress={() => handleSelectHashtag(item)}
                          onPressIn={() => setSelectedHashtagIndex(index)}>
                          <View style={[styles.hashtagIcon, { backgroundColor: theme.backgroundSelected }]}>
                            <ThemedText type="smallBold" style={{ color: theme.text, fontSize: 13 }}>#</ThemedText>
                          </View>
                          <View style={styles.autocompleteInfo}>
                            <ThemedText type="smallBold" style={[styles.autocompleteName, { color: theme.text }]}>
                              {item.tag}
                            </ThemedText>
                          </View>
                        </Pressable>
                      )}
                    />
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <View
              style={[
                styles.button,
                styles.cancelButton,
                { borderColor: theme.border },
              ]}>
              <ThemedText
                type="smallBold"
                style={styles.cancelText}
                onPress={handleCancel}>
                Cancel
              </ThemedText>
            </View>
            <View
              style={[
                styles.button,
                styles.submitButton,
                {
                  backgroundColor:
                    isValid && hasChanges && !isSubmitting ? theme.primary : theme.muted,
                  opacity: isSubmitting ? 0.7 : 1,
                },
              ]}>
              <ThemedText
                type="smallBold"
                style={styles.submitText}
                onPress={
                  isValid && hasChanges && !isSubmitting ? handleSubmit : undefined
                }>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </ThemedText>
            </View>
          </View>
        </View>
      </ThemedView>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  backButton: {
    padding: Spacing.one,
  },
  headerContent: {
    flex: 1,
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
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 120,
  },
  contentContainer: {
    position: 'relative',
  },
  autocompleteDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 220,
    marginTop: Spacing.one,
    borderRadius: Radii.lg,
    zIndex: 1000,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  autocompleteLoading: {
    padding: Spacing.three,
    alignItems: 'center',
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two + 4,
  },
  autocompleteInfo: {
    flex: 1,
    gap: 1,
  },
  autocompleteName: {
    fontSize: 14,
  },
  autocompleteSubtext: {
    fontSize: 12,
  },
  hashtagIcon: {
    width: 30,
    height: 30,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.three,
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
});
