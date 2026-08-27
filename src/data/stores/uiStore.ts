import { create } from 'zustand';
import type { AppError } from '@/types';
import { useLogStore } from './logStore';

export type ToastType = 'success' | 'info' | 'warning';

export interface ToastData {
  id: number;
  message: string;
  type: ToastType;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface UIState {
  error: AppError | null;
  isLoading: boolean;
  toast: ToastData | null;
  confirmDialog: ConfirmDialogOptions | null;
  setError: (error: AppError) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  showToast: (message: string, type?: ToastType) => void;
  clearToast: () => void;
  showConfirm: (options: ConfirmDialogOptions) => void;
  hideConfirm: () => void;
}

let toastId = 0;

export const useUIStore = create<UIState>((set) => ({
  error: null,
  isLoading: false,
  toast: null,
  confirmDialog: null,
  setError: (error) => {
    useLogStore.getState().addLog('error', `[AppError] ${error.code}: ${error.message}`, error, 'UI');
    set({ error });
  },
  clearError: () => set({ error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  showToast: (message, type = 'info') =>
    set({ toast: { id: ++toastId, message, type } }),
  clearToast: () => set({ toast: null }),
  showConfirm: (confirmDialog) => set({ confirmDialog }),
  hideConfirm: () => set({ confirmDialog: null }),
}));