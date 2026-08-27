import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { AppModal } from '@/components/ui/app-modal';
import { AppPressable } from '@/components/ui/app-pressable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createApiClient } from '@/data/api/client';
import { getIdToken } from '@/data/auth/firebaseAuth';
import type { ApiAvatarOption } from '@/data/api/types';

const client = createApiClient(getIdToken);

interface AvatarPickerModalProps {
  visible: boolean;
  currentColor: string | null;
  currentAvatarUrl?: string | null;
  onClose: () => void;
  onSelectAvatarOption: (color: string | null, url: string | null) => void;
}

export function AvatarPickerModal({
  visible,
  currentColor,
  currentAvatarUrl,
  onClose,
  onSelectAvatarOption,
}: AvatarPickerModalProps) {
  const theme = useTheme();
  const [avatarOptions, setAvatarOptions] = useState<ApiAvatarOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // Pending selection — only applied to the profile when the user taps Done
  const [pendingColor, setPendingColor] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const fetchAvatarOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
      const response = await client.get<ApiAvatarOption[] | { results: ApiAvatarOption[] }>('/users/avatar-options');
      setAvatarOptions(Array.isArray(response) ? response : (response.results ?? []));
    } catch {
      // Silently fail — fallback to manual URL input
    } finally {
      setIsLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setPendingColor(currentColor);
      setPendingUrl(currentAvatarUrl ?? null);
      fetchAvatarOptions();
    }
  }, [visible, currentColor, currentAvatarUrl, fetchAvatarOptions]);

  const handlePickColor = (color: string) => {
    setPendingColor(color);
  };

  const handlePickNoColor = () => {
    setPendingColor(null);
  };

  const handlePickAvatar = (option: ApiAvatarOption) => {
    setPendingUrl(option.url);
    if (option.color) {
      setPendingColor(option.color);
    }
  };

  const handlePickNoAvatar = () => {
    setPendingUrl(null);
  };

  const handleDone = () => {
    onSelectAvatarOption(pendingColor, pendingUrl);
    onClose();
  };

  // API options split into two groups: color-only and image avatars
  const colorOptions = avatarOptions.filter(
    (option) => !option.url && option.color,
  );
  const avatarOptionsWithUrl = avatarOptions.filter((option) => option.url);

  return (
    <AppModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <AppPressable style={styles.backdrop} onPress={onClose} />
        <ThemedView type="backgroundElement" style={styles.sheet}>
          {/* Blocks the dismiss layer — taps inside the sheet do not close */}
          <AppPressable style={StyleSheet.absoluteFill} onPress={() => {}} />
          <View style={styles.handle} />
          <ThemedText type="subtitle" style={styles.title}>
            Change Avatar
          </ThemedText>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {/* Avatar options from API */}
            {isLoadingOptions ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : (
              <>
                {/* Colors first — from the API, no hardcoded presets */}
                {colorOptions.length > 0 && (
                  <>
                    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                      Choose a color
                    </ThemedText>
                    <View style={styles.colorGrid}>
                      <AppPressable
                        onPress={handlePickNoColor}
                        style={[
                          styles.noColorOption,
                          pendingColor === null && styles.optionSelected,
                        ]}>
                        <Ionicons name="close" size={20} color="#FFFFFF" />
                        {pendingColor === null && (
                          <View style={styles.checkBadge}>
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          </View>
                        )}
                      </AppPressable>
                      {colorOptions.map((option) => {
                        const isSelected = pendingColor === option.color;
                        return (
                          <AppPressable
                            key={option.id}
                            onPress={() => handlePickColor(option.color!)}
                            style={[
                              styles.colorCircle,
                              { backgroundColor: option.color! },
                              isSelected && styles.optionSelected,
                            ]}>
                            {isSelected && (
                              <View style={styles.checkBadge}>
                                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                              </View>
                            )}
                          </AppPressable>
                        );
                      })}
                    </View>
                  </>
                )}

                {/* Avatars second — from the API, "no avatar" circle first */}
                {avatarOptionsWithUrl.length > 0 && (
                  <>
                    <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
                      Choose an avatar
                    </ThemedText>
                    <View style={styles.avatarGrid}>
                      <AppPressable
                        onPress={handlePickNoAvatar}
                        style={[
                          styles.noAvatarOption,
                          pendingUrl === null && styles.optionSelected,
                        ]}>
                        <Ionicons name="person-outline" size={28} color="#FFFFFF" />
                        {pendingUrl === null && (
                          <View style={styles.checkBadge}>
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          </View>
                        )}
                      </AppPressable>
                      {avatarOptionsWithUrl.map((option) => {
                        const isSelected = pendingUrl === option.url;
                        return (
                          <AppPressable
                            key={option.id}
                            onPress={() => handlePickAvatar(option)}
                            style={[
                              styles.avatarOption,
                              { backgroundColor: option.color ?? 'transparent' },
                              isSelected && styles.optionSelected,
                            ]}>
                            <Image
                              source={{ uri: option.url! }}
                              style={styles.avatarOptionImage}
                              contentFit="cover"
                              cachePolicy="memory-disk"
                            />
                            {isSelected && (
                              <View style={styles.checkBadge}>
                                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                              </View>
                            )}
                          </AppPressable>
                        );
                      })}
                    </View>
                  </>
                )}
              </>
            )}
          </ScrollView>

          {/* Actions — Cancel discards the pending selection, Done applies it */}
          <View style={styles.actions}>
            <AppPressable
              onPress={onClose}
              style={[styles.actionButton, styles.cancelButton, { borderColor: theme.border }]}>
              <ThemedText type="smallBold" style={styles.cancelText}>
                Cancel
              </ThemedText>
            </AppPressable>
            <AppPressable
              onPress={handleDone}
              style={[styles.actionButton, { backgroundColor: theme.primary }]}>
              <ThemedText type="smallBold" style={styles.doneText}>
                Done
              </ThemedText>
            </AppPressable>
          </View>
        </ThemedView>
      </View>
    </AppModal>
  );
}

const CIRCLE_SIZE = 52;

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
  title: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  sectionTitle: {
    marginTop: Spacing.two,
  },
  loadingContainer: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
  },
  avatarOption: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOptionImage: {
    width: '100%',
    height: '100%',
    borderRadius: CIRCLE_SIZE / 2,
    overflow: 'hidden',
  },
  noAvatarOption: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#B0BEC5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noColorOption: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#616161',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#999',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
  },
  colorCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
  },
  optionSelected: {
    borderWidth: 3,
    borderColor: '#3c87f7',
    elevation: 4,
    transform: [{ scale: 1.05 }],
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3c87f7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.two + 1,
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
  doneText: {
    color: '#FFFFFF',
  },
});