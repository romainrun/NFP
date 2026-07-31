import { useWindowDimensions } from 'react-native';
import { APP_CONFIG } from '@/core/config/appConfig';

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= APP_CONFIG.tabletMinWidth;
  const isLandscape = width > height;

  return {
    width,
    height,
    isTablet,
    isLandscape,
    /** Two-pane POS shell on tablets. */
    useSplitLayout: isTablet,
    contentMaxWidth: isTablet ? 1200 : undefined,
  };
}
