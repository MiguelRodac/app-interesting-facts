import { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';
import { AppModal } from '@/shared/ui/app-modal';
import { AppPressable } from '@/shared/ui/app-pressable';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/shared/ui/themed-text';
import { ThemedView } from '@/shared/ui/themed-view';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { createApiClient } from '@/shared/api/client';
import { getIdToken } from '@/features/auth/services/firebaseAuth';
import type { ApiAvatarOption } from '@/shared/api/types';
import { AvatarColorGrid } from './AvatarColorGrid';
import { AvatarImageGrid } from './AvatarImageGrid';

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
  const { t } = useTranslation(['profile', 'common']);
  const theme = useTheme();
  const [avatarOptions, setAvatarOptions] = useState<ApiAvatarOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // Pending selection — only applied to profile on Done
  const [pendingColor, setPendingColor] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setPendingColor(currentColor);
      setPendingUrl(currentAvatarUrl ?? null);
      if (avatarOptions.length === 0) {
        setIsLoadingOptions(true);
      }
    }
  }

  useEffect(() => {
    if (!visible) return;
    let active = true;
    client
      .get<ApiAvatarOption[] | { results: ApiAvatarOption[] }>('/users/avatar-options')
      .then((response) => {
        if (!active) return;
        setAvatarOptions(Array.isArray(response) ? response : (response.results ?? []));
      })
      .catch(() => {
        // Silently fail
      })
      .finally(() => {
        if (active) setIsLoadingOptions(false);
      });
    return () => {
      active = false;
    };
  }, [visible]);

  const handleDone = () => {
    onSelectAvatarOption(pendingColor, pendingUrl);
    onClose();
  };

  const colorOptions = avatarOptions.filter((option) => !option.url && option.color);
  const avatarOptionsWithUrl = avatarOptions.filter((option) => option.url);

  return (
    <AppModal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <AppPressable style={styles.backdrop} onPress={onClose} />
        <ThemedView type="backgroundElement" style={styles.sheet}>
          <AppPressable style={StyleSheet.absoluteFill} onPress={() => {}} />
          <View style={styles.handle} />
          <ThemedText type="subtitle" style={styles.title}>
            {t('profile:changeAvatar')}
          </ThemedText>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {isLoadingOptions ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : (
              <>
                <AvatarColorGrid
                  colorOptions={colorOptions}
                  pendingColor={pendingColor}
                  onPickColor={(color) => setPendingColor(color)}
                  onPickNoColor={() => setPendingColor(null)}
                />

                <AvatarImageGrid
                  avatarOptionsWithUrl={avatarOptionsWithUrl}
                  pendingUrl={pendingUrl}
                  onPickAvatar={(option) => setPendingUrl(option.url!)}
                  onPickNoAvatar={() => setPendingUrl(null)}
                />
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <AppPressable style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={onClose}>
              <ThemedText type="smallBold">{t('common:cancel')}</ThemedText>
            </AppPressable>
            <AppPressable style={[styles.doneBtn, { backgroundColor: theme.primary }]} onPress={handleDone}>
              <ThemedText type="smallBold" style={styles.doneText}>
                {t('common:done')}
              </ThemedText>
            </AppPressable>
          </View>
        </ThemedView>
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
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    paddingHorizontal: Spacing.four,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8E8E93',
    alignSelf: 'center',
    marginBottom: Spacing.three,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  content: {
    gap: Spacing.four,
    paddingBottom: Spacing.four,
  },
  loadingContainer: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    color: '#FFFFFF',
  },
});