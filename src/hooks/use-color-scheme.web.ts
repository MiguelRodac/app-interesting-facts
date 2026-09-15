import { useSyncExternalStore } from 'react';
import { useThemeContext } from './theme-provider';

const emptySubscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const { colorScheme } = useThemeContext();

  if (isClient) {
    return colorScheme;
  }

  return 'light';
}
