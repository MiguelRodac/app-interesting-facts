import React from 'react';
import { render } from '@testing-library/react-native';
import { CharCounter } from '@/shared/ui/CharCounter';

describe('CharCounter UI component', () => {
  it('renders character count ratio', async () => {
    const { getByText } = await render(<CharCounter current={50} min={10} max={200} />);
    expect(getByText('50/200')).toBeTruthy();
  });

  it('renders hint when current is less than minimum', async () => {
    const { getByText } = await render(<CharCounter current={4} min={10} max={200} />);
    expect(getByText('4/200')).toBeTruthy();
    // Default fallback hint renders "6 more needed"
    expect(getByText(/6/)).toBeTruthy();
  });

  it('does not render hint when current reaches or exceeds minimum', async () => {
    const { getByText } = await render(<CharCounter current={15} min={10} max={200} />);
    expect(getByText('15/200')).toBeTruthy();
  });
});
