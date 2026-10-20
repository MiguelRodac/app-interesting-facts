import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useSegments } from 'expo-router';

import { AppUpdateGate } from '@/features/update/AppUpdateGate';
import { useUpdateStore } from '@/features/update/stores/updateStore';

describe('AppUpdateGate component', () => {
  beforeEach(() => {
    useUpdateStore.setState({ updateRequired: false });
    (useSegments as jest.Mock).mockReturnValue(['(tabs)']);
  });

  it('renders nothing when updateRequired is false', async () => {
    const { queryByText } = await render(<AppUpdateGate />);
    expect(queryByText(/Versión desactualizada/i)).toBeNull();
    expect(queryByText(/Actualizar en la página web/i)).toBeNull();
  });

  it('renders blocking update gate when updateRequired is true', async () => {
    useUpdateStore.setState({ updateRequired: true });

    const { getByText } = await render(<AppUpdateGate />);

    expect(getByText('Versión desactualizada')).toBeTruthy();
    expect(getByText('Actualizar en la página web')).toBeTruthy();
    expect(getByText('¿Cómo instalar el APK?')).toBeTruthy();
  });

  it('opens and closes install guide modal on user interaction', async () => {
    useUpdateStore.setState({ updateRequired: true });

    const { getByText, queryByText } = await render(<AppUpdateGate />);

    // Click on guide link
    const guideLink = getByText('¿Cómo instalar el APK?');
    fireEvent.press(guideLink);

    // Guide modal content should be visible after state update
    await waitFor(() => {
      expect(getByText('¿Cómo instalar la actualización?')).toBeTruthy();
      expect(getByText(/1\. Ir a la página web/i)).toBeTruthy();
    });

    // Click on close button
    const closeBtn = getByText(/Entendido/i);
    fireEvent.press(closeBtn);

    // Modal is closed
    await waitFor(() => {
      expect(queryByText('¿Cómo instalar la actualización?')).toBeNull();
    });
  });

  it('does not render on web when accessing landing page', async () => {
    const originalPlatform = Platform.OS;
    try {
      Platform.OS = 'web';
      (useSegments as jest.Mock).mockReturnValue(['landing']);
      useUpdateStore.setState({ updateRequired: true });

      const { queryByText } = await render(<AppUpdateGate />);
      expect(queryByText(/Versión desactualizada/i)).toBeNull();
    } finally {
      Platform.OS = originalPlatform;
    }
  });
});
