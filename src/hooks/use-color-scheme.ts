import { useThemeContext } from './theme-provider';

export function useColorScheme() {
  const { colorScheme } = useThemeContext();
  return colorScheme;
}
