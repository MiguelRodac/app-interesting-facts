import { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
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
  onSelectColor: (color: string | null) => void;
  onSelectAvatarOption: (color: string | null, url: string | null) => void;
}

export function AvatarPickerModal({
  visible,
  currentColor,
  currentAvatarUrl,
  onClose,
  onSelectColor,
  onSelectAvatarOption,
}: AvatarPickerModalProps) {
  const theme = useTheme();
  const [avatarOptions, setAvatarOptions] = useState<ApiAvatarOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

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
      fetchAvatarOptions();
    }
  }, [visible, fetchAvatarOptions]);

  const handleSelectAvatarOption = (option: ApiAvatarOption) => {
    // Delegate to the parent — it knows how to merge color/url correctly
    onSelectAvatarOption(option.color, option.url);
    onClose();
  };

  // API options split into two groups: color-only and image avatars
  const colorOptions = avatarOptions.filter(
    (option) => !option.url && option.color,
  );
  const avatarOptionsWithUrl = avatarOptions.filter((option) => option.url);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Tap outside to dismiss — like Cancel */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <ThemedView type="backgroundElement" style={styles.sheet}>
          {/* Blocks the dismiss layer — taps inside the sheet do not close */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />
          <View style={styles.handle} />
          <ThemedText type="subtitle" style={styles.title}>
            Change Avatar
          </ThemedText>

          <ScrollView contentContainerStyle={styles.content}>
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
                      {colorOptions.map((option) => {
                        const isSelected = currentColor === option.color;
                        return (
                          <Pressable
                            key={option.id}
                            onPress={() => {
                              onSelectColor(option.color);
                              onClose();
                            }}
                            style={[
                              styles.colorCircle,
                              { backgroundColor: option.color! },
                              isSelected && styles.colorCircleSelected,
                            ]}
                          />
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
                      <Pressable
                        onPress={() => {
                          onSelectAvatarOption(null, null);
                          onClose();
                        }}
                        style={[
                          styles.noAvatarOption,
                          !currentAvatarUrl && !currentColor && styles.avatarOptionSelected,
                        ]}>
                        <Ionicons name="person-outline" size={28} color="#FFFFFF" />
                      </Pressable>
                      {avatarOptionsWithUrl.map((option) => {
                        const isSelected = currentAvatarUrl === option.url;
                        return (
                          <Pressable
                            key={option.id}
                            onPress={() => handleSelectAvatarOption(option)}
                            style={[
                              styles.avatarOption,
                              { backgroundColor: option.color ?? '#E0E0E0' },
                              isSelected && styles.avatarOptionSelected,
                            ]}>
                            <Image
                              source={{ uri: option.url! }}
                              style={styles.avatarOptionImage}
                              resizeMode="cover"
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                )}
              </>
            )}
          </ScrollView>

          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={{ top: 6, bottom: 6 }}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Cancel
            </ThemedText>
          </Pressable>
        </ThemedView>
      </View>
    </Modal>
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
    gap: Spacing.two + 2,
  },
  avatarOption: {
    width: '17.5%',
    aspectRatio: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  avatarOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    elevation: 4,
  },
  avatarOptionImage: {
    width: '100%',
    height: '100%',
  },
  noAvatarOption: {
    width: '17.5%',
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: '#B0BEC5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: Spacing.two + 2,
  },
  colorCircle: {
    width: '17.5%',
    aspectRatio: 1,
    borderRadius: 999,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    elevation: 4,
  },
  closeButton: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
    paddingVertical: Spacing.one + 2,
  },
});
