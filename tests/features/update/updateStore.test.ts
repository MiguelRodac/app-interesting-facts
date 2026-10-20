import { useUpdateStore } from '@/features/update/stores/updateStore';

describe('useUpdateStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUpdateStore.setState({ updateRequired: false });
  });

  it('initializes with updateRequired as false', () => {
    const state = useUpdateStore.getState();
    expect(state.updateRequired).toBe(false);
  });

  it('updates updateRequired to true when flagUpdateRequired is invoked', () => {
    expect(useUpdateStore.getState().updateRequired).toBe(false);

    useUpdateStore.getState().flagUpdateRequired();

    expect(useUpdateStore.getState().updateRequired).toBe(true);
  });
});
