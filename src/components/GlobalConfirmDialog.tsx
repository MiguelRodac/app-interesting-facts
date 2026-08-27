import { useCallback } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { useUIStore } from '@/data/stores/uiStore';

export function GlobalConfirmDialog() {
  const confirmDialog = useUIStore((s) => s.confirmDialog);
  const hideConfirm = useUIStore((s) => s.hideConfirm);

  const handleConfirm = useCallback(async () => {
    if (!confirmDialog) return;
    const action = confirmDialog.onConfirm;
    hideConfirm();
    try {
      await action();
    } catch {
      // Ignore confirmation error
    }
  }, [confirmDialog, hideConfirm]);

  const handleCancel = useCallback(() => {
    confirmDialog?.onCancel?.();
    hideConfirm();
  }, [confirmDialog, hideConfirm]);

  if (!confirmDialog) return null;

  return (
    <ConfirmDialog
      visible={!!confirmDialog}
      title={confirmDialog.title}
      message={confirmDialog.message}
      confirmLabel={confirmDialog.confirmLabel}
      cancelLabel={confirmDialog.cancelLabel}
      destructive={confirmDialog.destructive}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}
