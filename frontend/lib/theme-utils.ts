/**
 * Theme utility functions for consistent styling across components
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  PortalType,
  ThemeMode,
  ColorScheme,
  NavigationTheme,
  getColorScheme,
  getNavigationTheme,
  THEME_CLASSES,
} from './theme-config';

/**
 * Enhanced cn utility that merges theme classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get theme-aware button classes
 */
export function getButtonClasses(
  variant: 'primary' | 'secondary' | 'ghost' | 'outline' = 'primary',
  size: 'sm' | 'md' | 'lg' = 'md',
  portal?: PortalType,
  mode?: ThemeMode
) {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';
  
  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 px-8',
  };
  
  const variantClasses = {
    primary: THEME_CLASSES.button.primary,
    secondary: THEME_CLASSES.button.secondary,
    ghost: THEME_CLASSES.button.ghost,
    outline: 'border border-[var(--theme-border)] bg-transparent hover:bg-[var(--theme-surface)] text-[var(--theme-text)]',
  };
  
  return cn(
    baseClasses,
    sizeClasses[size],
    variantClasses[variant]
  );
}

/**
 * Get theme-aware navigation classes
 */
export function getNavigationClasses(
  variant: 'container' | 'item' | 'logo' | 'active' = 'container'
) {
  const classes = {
    container: cn(
      THEME_CLASSES.nav.background,
      THEME_CLASSES.nav.text,
      'backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--theme-nav-background)]/90 shadow-sm'
    ),
    item: cn(
      THEME_CLASSES.nav.text,
      THEME_CLASSES.nav.hover,
      'transition-all duration-300 cursor-pointer nav-item'
    ),
    logo: cn(
      THEME_CLASSES.nav.logo,
      'font-semibold text-xl font-[\'Lato\']'
    ),
    active: cn(
      THEME_CLASSES.nav.active,
      THEME_CLASSES.nav.text
    ),
  };
  
  return classes[variant];
}

/**
 * Get theme-aware card classes
 */
export function getCardClasses(
  variant: 'default' | 'clickable' | 'elevated' = 'default'
) {
  const baseClasses = cn(
    THEME_CLASSES.surface.card,
    'rounded-lg shadow-sm'
  );
  
  const variantClasses = {
    default: '',
    clickable: 'cursor-pointer hover:shadow-md transition-shadow duration-200 clickable',
    elevated: 'shadow-lg',
  };
  
  return cn(baseClasses, variantClasses[variant]);
}

/**
 * Get theme-aware text classes
 */
export function getTextClasses(
  variant: 'primary' | 'secondary' | 'muted' = 'primary'
) {
  return THEME_CLASSES.text[variant];
}

/**
 * Get theme-aware status classes
 */
export function getStatusClasses(
  status: 'success' | 'warning' | 'error' | 'info'
) {
  return cn(
    THEME_CLASSES.status[status],
    'px-2 py-1 rounded-md text-sm font-medium'
  );
}

/**
 * Get theme-aware form input classes
 */
export function getInputClasses(
  variant: 'default' | 'error' = 'default'
) {
  const baseClasses = 'flex h-10 w-full rounded-md border bg-[var(--theme-background)] px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--theme-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
  
  const variantClasses = {
    default: 'border-[var(--theme-border)] text-[var(--theme-text)]',
    error: 'border-[var(--theme-error)] text-[var(--theme-text)]',
  };
  
  return cn(baseClasses, variantClasses[variant]);
}

/**
 * Get theme-aware admin-specific classes
 */
export function getAdminClasses(
  component: 'card' | 'nav-item' | 'button' | 'table-row' = 'card'
) {
  const classes = {
    card: 'admin-card bg-white/80 dark:bg-gray-800/80 backdrop-blur-10 border border-[var(--theme-border)] rounded-xl shadow-sm',
    'nav-item': 'admin-nav-item transition-all duration-200 rounded-lg margin-y-1 cursor-pointer hover:bg-[var(--theme-primary)]/10 hover:translate-x-0.5',
    button: 'admin-btn-primary bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-light)] text-white border-none transition-all duration-200 cursor-pointer hover:from-[var(--theme-primary-dark)] hover:to-[var(--theme-primary)] hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60',
    'table-row': 'admin-table-row transition-all duration-200 border-b border-[var(--theme-border)] hover:bg-[var(--theme-primary)]/5 cursor-pointer',
  };
  
  return classes[component];
}

/**
 * Generate optimized CSS custom properties object for inline styles
 */
export function getThemeStyles(
  portal: PortalType,
  mode: ThemeMode
): React.CSSProperties {
  const colorScheme = getColorScheme(portal, mode);
  const navigation = getNavigationTheme();
  
  return {
    '--theme-primary': colorScheme.primary,
    '--theme-primary-light': colorScheme.primaryLight,
    '--theme-primary-dark': colorScheme.primaryDark,
    '--theme-secondary': colorScheme.secondary,
    '--theme-background': colorScheme.background,
    '--theme-surface': colorScheme.surface,
    '--theme-text': colorScheme.text,
    '--theme-text-secondary': colorScheme.textSecondary,
    '--theme-text-muted': colorScheme.textMuted,
    '--theme-border': colorScheme.border,
    '--theme-success': colorScheme.success,
    '--theme-warning': colorScheme.warning,
    '--theme-error': colorScheme.error,
    '--theme-info': colorScheme.info,
    '--theme-nav-background': navigation.background,
    '--theme-nav-text': navigation.text,
    '--theme-nav-hover': navigation.hover,
  } as React.CSSProperties;
}



/**
 * Portal-specific utility classes
 */
export const PORTAL_CLASSES = {
  admin: 'portal-admin font-inter',
  photographer: 'portal-photographer font-inter',
  client: 'portal-client font-lato',
} as const;

/**
 * Animation classes for theme transitions
 */
export const ANIMATION_CLASSES = {
  fadeIn: 'animate-in fade-in duration-300',
  slideIn: 'animate-in slide-in-from-left duration-300',
  scaleIn: 'animate-in zoom-in duration-200',
  shimmer: 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',
} as const;