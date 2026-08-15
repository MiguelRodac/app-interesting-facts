import { create } from 'zustand';

interface CreateScreenGuardState {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  clearGuard: () => void;
  formResetCount: number;
  triggerFormReset: () => void;
}

export const useCreateScreenGuard = create<CreateScreenGuardState>((set) => ({
  hasUnsavedChanges: false,
  setHasUnsavedChanges: (value) => set({ hasUnsavedChanges: value }),
  clearGuard: () => set({ hasUnsavedChanges: false }),
  formResetCount: 0,
  triggerFormReset: () => set((state) => ({ formResetCount: state.formResetCount + 1 })),
}));
