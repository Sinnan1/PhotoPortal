"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  PortalType,
  ThemeMode,
  PortalTheme,
  ColorScheme,
  NavigationTheme,
  getPortalTheme,
  getColorScheme,
  getNavigationTheme,
  applyThemeToDocument,
  getPortalFromPath,
  UNIFIED_THEME_CONFIG,
} from '@/lib/theme-config';

/**
 * Theme context interface
 */
interface ThemeContextValue {
  // Current portal and theme mode
  portal: PortalType;
  mode: ThemeMode;

  // Theme configurations
  portalTheme: PortalTheme;
  colorScheme: ColorScheme;
  navigationTheme: NavigationTheme;

  // Theme switching functions
  setPortal: (portal: PortalType) => void;
  toggleMode: () => void;

  // Utility functions
  isLoading: boolean;
  getThemeClass: (category: string, variant: string) => string;
}

/**
 * Theme context
 */
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Theme provider props
 */
interface ThemeProviderProps {
  children: React.ReactNode;
  defaultPortal?: PortalType;
  enableAutoPortalDetection?: boolean;
}

/**
 * Unified theme provider component
 * 
 * This component provides theme configuration and management across all portals.
 * It automatically detects the current portal from the URL path and applies
 * the appropriate theme configuration.
 */
export function UnifiedThemeProvider({
  children,
  defaultPortal = 'client',
  enableAutoPortalDetection = true,
}: ThemeProviderProps) {
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();

  // State for current portal and loading status
  const [portal, setPortalState] = useState<PortalType>(defaultPortal);
  const [isLoading, setIsLoading] = useState(true);

  // Determine current portal from pathname
  useEffect(() => {
    if (enableAutoPortalDetection && pathname) {
      const detectedPortal = getPortalFromPath(pathname);
      setPortalState(detectedPortal);
    }
  }, [pathname, enableAutoPortalDetection]);

  // Get current theme mode
  const mode: ThemeMode = (resolvedTheme as ThemeMode) || 'light';

  // Get theme configurations
  const portalTheme = getPortalTheme(portal);
  const colorScheme = getColorScheme(portal, mode);
  const navigationTheme = getNavigationTheme();

  // Apply theme to document when portal or mode changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      applyThemeToDocument(portal, mode);
      setIsLoading(false);
    }
  }, [portal, mode]);

  // Theme switching functions
  const setPortal = (newPortal: PortalType) => {
    setPortalState(newPortal);
  };

  const toggleMode = () => {
    setTheme(mode === 'dark' ? 'light' : 'dark');
  };

  // Utility function to get theme classes
  const getThemeClass = (category: string, variant: string): string => {
    // This could be expanded to return specific theme classes
    // For now, it returns a basic implementation
    return `theme-${category}-${variant}`;
  };

  const contextValue: ThemeContextValue = {
    portal,
    mode,
    portalTheme,
    colorScheme,
    navigationTheme,
    setPortal,
    toggleMode,
    isLoading,
    getThemeClass,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to use the unified theme context
 */
export function useUnifiedTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useUnifiedTheme must be used within a UnifiedThemeProvider');
  }
  return context;
}

/**
 * Hook to get theme-aware CSS classes
 */
export function useThemeClasses() {
  const { colorScheme, navigationTheme, mode, portal } = useUnifiedTheme();

  return {
    // Navigation classes
    nav: {
      container: `bg-[${navigationTheme.background}] text-[${navigationTheme.text}]`,
      item: `text-[${navigationTheme.text}] hover:bg-[${navigationTheme.hover}]`,
    },

    // Button classes
    button: {
      primary: `bg-[${colorScheme.primary}] text-white hover:bg-[${colorScheme.primaryDark}]`,
      secondary: `bg-[${colorScheme.secondary}] text-[${colorScheme.text}] hover:opacity-90`,
      ghost: `hover:bg-[${colorScheme.surface}] text-[${colorScheme.text}]`,
    },

    // Surface classes
    surface: {
      primary: `bg-[${colorScheme.background}] text-[${colorScheme.text}]`,
      secondary: `bg-[${colorScheme.surface}] text-[${colorScheme.text}]`,
      card: `bg-[${colorScheme.surface}] border border-[${colorScheme.border}] text-[${colorScheme.text}]`,
    },

    // Text classes
    text: {
      primary: `text-[${colorScheme.text}]`,
      secondary: `text-[${colorScheme.textSecondary}]`,
      muted: `text-[${colorScheme.textMuted}]`,
    },

    // Status classes
    status: {
      success: `text-[${colorScheme.success}] bg-[${colorScheme.success}]/10 border border-[${colorScheme.success}]/20`,
      warning: `text-[${colorScheme.warning}] bg-[${colorScheme.warning}]/10 border border-[${colorScheme.warning}]/20`,
      error: `text-[${colorScheme.error}] bg-[${colorScheme.error}]/10 border border-[${colorScheme.error}]/20`,
      info: `text-[${colorScheme.info}] bg-[${colorScheme.info}]/10 border border-[${colorScheme.info}]/20`,
    },

    // Portal-specific classes
    portal: `portal-${portal}`,
    mode: mode,
  };
}

/**
 * Higher-order component to wrap components with theme context
 */
export function withUnifiedTheme<P extends object>(
  Component: React.ComponentType<P>
) {
  return function ThemedComponent(props: P) {
    return (
      <UnifiedThemeProvider>
        <Component {...props} />
      </UnifiedThemeProvider>
    );
  };
}

/**
 * Theme configuration hook for accessing raw theme data
 */
export function useThemeConfig() {
  const { portal, mode } = useUnifiedTheme();

  return {
    config: UNIFIED_THEME_CONFIG,
    currentPortal: portal,
    currentMode: mode,
    portalTheme: getPortalTheme(portal),
    colorScheme: getColorScheme(portal, mode),
    navigationTheme: getNavigationTheme(),
  };
}

/**
 * Compatibility export for existing layout
 * This wraps the next-themes ThemeProvider with our UnifiedThemeProvider
 */
import { ThemeProvider as NextThemeProvider } from 'next-themes';

interface CompatibleThemeProviderProps {
  children: React.ReactNode;
  attribute?: 'class' | 'data-theme' | 'data-mode';
  defaultTheme?: string;
  enableSystem?: boolean;
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "dark",
  enableSystem = true
}: CompatibleThemeProviderProps) {
  return (
    <NextThemeProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
    >
      <UnifiedThemeProvider>
        {children}
      </UnifiedThemeProvider>
    </NextThemeProvider>
  );
}