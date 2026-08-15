import { create } from 'zustand';
import type { AppError } from '@/types';

export type ToastType = 'success' | 'info' | 'warning';

export interface ToastData {
  id: number;
  message: string;
  type: ToastType;
}

interface UIState {
  error: AppError | null;
  isLoading: boolean;
  toast: ToastData | null;
  setError: (error: AppError) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  showToast: (message: string, type?: ToastType) => void;
  clearToast: () => void;
}

let toastId = 0;

export const useUIStore = create<UIState>((set) => ({
  error: null,
  isLoading: false,
  toast: null,
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  showToast: (message, type = 'info') =>
    set({ toast: { id: ++toastId, message, type } }),
  clearToast: () => set({ toast: null }),
}));