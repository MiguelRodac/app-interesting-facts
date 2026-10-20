import React from 'react';
import { render } from '@testing-library/react-native';
import { EmptyState } from '@/shared/ui/EmptyState';

describe('EmptyState UI component', () => {
  it('renders title correctly', async () => {
    const { getByText } = await render(<EmptyState title="No facts found" />);
    expect(getByText('No facts found')).toBeTruthy();
  });

  it('renders subtitle when provided', async () => {
    const { getByText } = await render(
      <EmptyState
        title="Empty List"
        subtitle="Be the first to share an interesting fact!"
      />
    );
    expect(getByText('Empty List')).toBeTruthy();
    expect(getByText('Be the first to share an interesting fact!')).toBeTruthy();
  });

  it('does not render subtitle if omitted', async () => {
    const { getByText, queryByText } = await render(<EmptyState title="Only Title" />);
    expect(getByText('Only Title')).toBeTruthy();
    expect(queryByText('Be the first to share an interesting fact!')).toBeNull();
  });
});
