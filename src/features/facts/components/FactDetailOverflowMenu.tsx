import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppPressable } from '@/shared/ui/app-pressable';
import { ThemedText } from '@/shared/ui/themed-text';
import { Radii, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

interface FactDetailOverflowMenuProps {
  visible: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const FactDetailOverflowMenu = React.memo(function FactDetailOverflowMenu({
  visible,
  onToggle,
  onClose,
  onEdit,
  onDelete,
}: FactDetailOverflowMenuProps) {
  const { t } = useTranslation('common');
  const theme = useTheme();

  return (
    <View style={styles.overflowContainer}>
      <AppPressable onPress={onToggle} hitSlop={8} style={styles.overflowBtn}>
        <Ionicons name="ellipsis-horizontal" size={22} color={theme.muted} />
      </AppPressable>
      {visible && (
        <>
          <AppPressable style={styles.tooltipBackdrop} onPress={onClose} />
          <View style={[styles.tooltip, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <AppPressable
              onPress={() => {
                onClose();
                onEdit();
              }}
              style={styles.tooltipItem}
              hitSlop={8}>
              <Ionicons name="create-outline" size={16} color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.primary }}>
                {t('common:edit')}
              </ThemedText>
            </AppPressable>
            <View style={[styles.tooltipDivider, { backgroundColor: theme.border }]} />
            <AppPressable
              onPress={() => {
                onClose();
                onDelete();
              }}
              style={styles.tooltipItem}
              hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={theme.destructive} />
              <ThemedText type="small" style={{ color: theme.destructive }}>
                {t('common:delete')}
              </ThemedText>
            </AppPressable>
            {/* Arrow */}
            <View style={[styles.tooltipArrow, { borderBottomColor: theme.border }]} />
            <View style={[styles.tooltipArrowInner, { borderBottomColor: theme.background }]} />
          </View>
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  overflowContainer: {
    position: 'relative',
    marginLeft: Spacing.one,
    zIndex: 300,
    elevation: 20,
  },
  overflowBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
  },
  tooltipBackdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 350,
  },
  tooltip: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 2,
    paddingVertical: Spacing.half,
    borderRadius: Radii.md,
    borderWidth: 1,
    minWidth: 130,
    ...Shadows.lg,
    zIndex: 400,
    elevation: 30,
  },
  tooltipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  tooltipDivider: {
    height: 1,
    marginHorizontal: Spacing.two,
  },
  tooltipArrow: {
    position: 'absolute',
    top: -6,
    right: 12,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  tooltipArrowInner: {
    position: 'absolute',
    top: -4.5,
    right: 13,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
