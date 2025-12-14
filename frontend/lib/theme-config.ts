/**
 * Unified Theme Configuration System for Yarrow Weddings & Co.
 * 
 * This module provides a centralized theme configuration system that ensures
 * consistent styling across all portals (Admin, Photographer, Client) while
 * allowing for portal-specific overrides.
 */

export type PortalType = 'admin' | 'photographer' | 'client';
export type ThemeMode = 'light' | 'dark';

/**
 * Optimized color scheme interface defining essential color tokens
 */
export interface ColorScheme {
  // Primary brand colors
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Secondary/accent colors
  secondary: string;

  // Background colors
  background: string;
  surface: string;

  // Text colors
  text: string;
  textSecondary: string;
  textMuted: string;

  // Border colors
  border: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
}

/**
 * Navigation-specific theme configuration
 */
export interface NavigationTheme {
  background: string;
  text: string;
  hover: string;
}

/**
 * Complete theme configuration for a portal
 */
export interface PortalTheme {
  id: string;
  portal: PortalType;
  name: string;
  light: ColorScheme;
  dark: ColorScheme;
  navigation: NavigationTheme;
}

/**
 * Unified theme configuration containing all portal themes
 */
export interface UnifiedThemeConfig {
  portals: Record<PortalType, PortalTheme>;
  shared: {
    navigation: NavigationTheme;
    borderRadius: string;
    fontFamily: {
      sans: string[];
      serif: string[];
      mono: string[];
    };
  };
}

/**
 * Base color palette used across all portals
 */
export const BASE_COLORS = {
  // Yarrow Weddings brand colors
  brand: {
    primary: '#425146',      // Main brand green
    primaryLight: '#5a6b5e', // Lighter brand green
    primaryDark: '#2a3329',  // Darker brand green
    accent: '#90856c',       // Brand accent (warm beige)
    accentLight: '#a39680',  // Lighter accent
    accentDark: '#7d7459',   // Darker accent
  },

  // Navigation standardized colors
  navigation: {
    background: '#505c51',   // Standardized nav background
    text: '#ffffff',         // White text
    hover: 'rgba(255, 255, 255, 0.1)', // White hover overlay
  },

  // Status colors
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },

  // Neutral colors for light mode
  light: {
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    textSecondary: '#475569',
    textMuted: '#64748b',
    border: '#e2e8f0',
  },

  // Neutral colors for dark mode
  dark: {
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    border: '#334155',
  },
} as const;

/**
 * Create an optimized color scheme with portal-specific overrides
 */
function createColorScheme(
  base: typeof BASE_COLORS.light | typeof BASE_COLORS.dark,
  overrides: Partial<ColorScheme> = {}
): ColorScheme {
  return {
    primary: BASE_COLORS.brand.primary,
    primaryLight: BASE_COLORS.brand.primaryLight,
    primaryDark: BASE_COLORS.brand.primaryDark,
    secondary: BASE_COLORS.brand.accent,
    background: base.background,
    surface: base.surface,
    text: base.text,
    textSecondary: base.textSecondary,
    textMuted: base.textMuted,
    border: base.border,
    success: BASE_COLORS.status.success,
    warning: BASE_COLORS.status.warning,
    error: BASE_COLORS.status.error,
    info: BASE_COLORS.status.info,
    ...overrides,
  };
}

/**
 * Unified theme configuration
 */
export const UNIFIED_THEME_CONFIG: UnifiedThemeConfig = {
  portals: {
    admin: {
      id: 'admin',
      portal: 'admin',
      name: 'Admin Portal',
      light: createColorScheme(BASE_COLORS.light),
      dark: createColorScheme(BASE_COLORS.dark),
      navigation: BASE_COLORS.navigation,
    },
    photographer: {
      id: 'photographer',
      portal: 'photographer',
      name: 'Photographer Portal',
      light: createColorScheme(BASE_COLORS.light),
      dark: createColorScheme(BASE_COLORS.dark),
      navigation: BASE_COLORS.navigation,
    },
    client: {
      id: 'client',
      portal: 'client',
      name: 'Client Portal',
      light: createColorScheme(BASE_COLORS.light),
      dark: createColorScheme(BASE_COLORS.dark),
      navigation: BASE_COLORS.navigation,
    },
  },
  shared: {
    navigation: BASE_COLORS.navigation,
    borderRadius: '0.625rem',
    fontFamily: {
      sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      serif: ['Lato', 'Georgia', 'serif'],
      mono: ['Fira Code', 'Monaco', 'Consolas', 'monospace'],
    },
  },
};

/**
 * Get theme configuration for a specific portal
 */
export function getPortalTheme(portal: PortalType): PortalTheme {
  return UNIFIED_THEME_CONFIG.portals[portal];
}

/**
 * Get color scheme for a specific portal and mode
 */
export function getColorScheme(portal: PortalType, mode: ThemeMode): ColorScheme {
  const portalTheme = getPortalTheme(portal);
  return portalTheme[mode];
}

/**
 * Get navigation theme (consistent across all portals)
 */
export function getNavigationTheme(): NavigationTheme {
  return UNIFIED_THEME_CONFIG.shared.navigation;
}

/**
 * Generate optimized CSS custom properties for a color scheme
 */
export function generateCSSCustomProperties(
  colorScheme: ColorScheme,
  navigation: NavigationTheme,
  prefix: string = '--theme'
): Record<string, string> {
  return {
    [`${prefix}-primary`]: colorScheme.primary,
    [`${prefix}-primary-light`]: colorScheme.primaryLight,
    [`${prefix}-primary-dark`]: colorScheme.primaryDark,
    [`${prefix}-secondary`]: colorScheme.secondary,
    [`${prefix}-background`]: colorScheme.background,
    [`${prefix}-surface`]: colorScheme.surface,
    [`${prefix}-text`]: colorScheme.text,
    [`${prefix}-text-secondary`]: colorScheme.textSecondary,
    [`${prefix}-text-muted`]: colorScheme.textMuted,
    [`${prefix}-border`]: colorScheme.border,
    [`${prefix}-success`]: colorScheme.success,
    [`${prefix}-warning`]: colorScheme.warning,
    [`${prefix}-error`]: colorScheme.error,
    [`${prefix}-info`]: colorScheme.info,
    [`${prefix}-nav-background`]: navigation.background,
    [`${prefix}-nav-text`]: navigation.text,
    [`${prefix}-nav-hover`]: navigation.hover,
  };
}

/**
 * Apply theme CSS custom properties to document root
 */
export function applyThemeToDocument(
  portal: PortalType,
  mode: ThemeMode,
  element: HTMLElement = document.documentElement
): void {
  const colorScheme = getColorScheme(portal, mode);
  const navigation = getNavigationTheme();
  const properties = generateCSSCustomProperties(colorScheme, navigation);

  Object.entries(properties).forEach(([property, value]) => {
    element.style.setProperty(property, value);
  });

  // Set portal-specific class for additional styling
  element.classList.remove('portal-admin', 'portal-photographer', 'portal-client');
  element.classList.add(`portal-${portal}`);

  // Set theme mode class
  element.classList.toggle('dark', mode === 'dark');
  element.classList.toggle('light', mode === 'light');
}

/**
 * Utility function to get current portal from pathname
 */
export function getPortalFromPath(pathname: string): PortalType {
  if (pathname.startsWith('/admin')) {
    return 'admin';
  }
  if (pathname.startsWith('/dashboard')) {
    return 'photographer';
  }
  // Default to client portal for public pages
  return 'client';
}

/**
 * Optimized theme utility class names for consistent styling
 */
export const THEME_CLASSES = {
  // Navigation classes
  nav: {
    background: 'bg-[var(--theme-nav-background)]',
    text: 'text-[var(--theme-nav-text)]',
    hover: 'hover:bg-[var(--theme-nav-hover)]',
    logo: 'text-[var(--theme-nav-text)]',
    active: 'bg-[var(--theme-nav-hover)]',
  },

  // Button classes
  button: {
    primary: 'bg-[var(--theme-primary)] text-[var(--theme-nav-text)] hover:bg-[var(--theme-primary-dark)]',
    secondary: 'bg-[var(--theme-secondary)] text-[var(--theme-text)]',
    ghost: 'hover:bg-[var(--theme-surface)] text-[var(--theme-text)]',
  },

  // Surface classes
  surface: {
    primary: 'bg-[var(--theme-background)] text-[var(--theme-text)]',
    card: 'bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-text)]',
  },

  // Text classes
  text: {
    primary: 'text-[var(--theme-text)]',
    secondary: 'text-[var(--theme-text-secondary)]',
    muted: 'text-[var(--theme-text-muted)]',
  },

  // Status classes
  status: {
    success: 'text-[var(--theme-success)] bg-[var(--theme-success)]/10 border-[var(--theme-success)]/20',
    warning: 'text-[var(--theme-warning)] bg-[var(--theme-warning)]/10 border-[var(--theme-warning)]/20',
    error: 'text-[var(--theme-error)] bg-[var(--theme-error)]/10 border-[var(--theme-error)]/20',
    info: 'text-[var(--theme-info)] bg-[var(--theme-info)]/10 border-[var(--theme-info)]/20',
  },
} as const;