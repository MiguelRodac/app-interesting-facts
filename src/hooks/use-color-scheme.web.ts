import { useEffect, useState } from 'react';
import { useThemeContext } from './theme-provider';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const { colorScheme } = useThemeContext();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
