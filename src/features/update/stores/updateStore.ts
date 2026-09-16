import { create } from 'zustand';

interface UpdateState {
  /** True once the backend rejects the client version — blocks the whole UI. */
  updateRequired: boolean;
  flagUpdateRequired: () => void;
}

/**
 * Global "app update required" flag. Flipped by the API client when the
 * backend version check rejects the client (426 / APP_VERSION_*); the root
 * layout renders a blocking gate while it's true.
 */
export const useUpdateStore = create<UpdateState>((set) => ({
  updateRequired: false,
  flagUpdateRequired: () => set({ updateRequired: true }),
}));
