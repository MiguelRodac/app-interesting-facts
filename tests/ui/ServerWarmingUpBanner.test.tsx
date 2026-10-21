import React from 'react';
import { render } from '@testing-library/react-native';
import { useUIStore } from '@/shared/stores/uiStore';
import { ServerWarmingUpBanner } from '@/shared/ui/ServerWarmingUpBanner';

describe('ServerWarmingUpBanner component', () => {
  beforeEach(() => {
    useUIStore.setState({ isServerWakingUp: false });
  });

  it('renders nothing when isServerWakingUp is false', async () => {
    const { queryByText } = await render(<ServerWarmingUpBanner />);
    expect(queryByText(/Despertando el servidor/i)).toBeNull();
  });

  it('renders warming up indicator when isServerWakingUp is true', async () => {
    useUIStore.setState({ isServerWakingUp: true });
    const { getByText } = await render(<ServerWarmingUpBanner />);
    expect(
      getByText(/Despertando el servidor... esto puede tardar unos segundos./i),
    ).toBeTruthy();
  });
});
