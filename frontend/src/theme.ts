import { Platform } from 'react-native';

export const theme = {
  colors: {
    surface: '#FFFFFF',
    onSurface: '#0F172A',
    surfaceSecondary: '#F8FAFC',
    onSurfaceSecondary: '#1E293B',
    surfaceTertiary: '#F1F5F9',
    onSurfaceTertiary: '#334155',
    surfaceInverse: '#0F172A',
    onSurfaceInverse: '#FFFFFF',
    brand: '#0B4DB8',
    brandDark: '#083A8E',
    brandTertiary: '#EFF6FF',
    onBrandTertiary: '#0B4DB8',
    gold: '#C68A2D',
    goldLight: '#E8B45C',
    goldTint: '#FDF7EC',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',
    divider: '#F1F5F9',
    muted: '#64748B',
    mutedLight: '#94A3B8',
    live: '#EF4444',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
  radius: { sm: 8, md: 14, lg: 20, xl: 24, pill: 999 },
  font: {
    displaySize: { sm: 16, md: 20, lg: 24, xl: 28, xxl: 32 },
    textSize: { xs: 11, sm: 12, base: 14, md: 15, lg: 16, xl: 18 },
    weight: {
      regular: '400' as const,
      medium: '500' as const,
      semi: '600' as const,
      bold: '700' as const,
      black: '800' as const,
    },
  },
  shadow: {
    card: Platform.select({
      ios: {
        shadowColor: '#0B4DB8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
      default: {},
    }),
    soft: Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: {},
    }),
    strong: Platform.select({
      ios: {
        shadowColor: '#0B4DB8',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
};

export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL as string;
export const API = `${BACKEND_URL}/api`;
