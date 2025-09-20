"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getPortalFromPath, PortalType } from '@/lib/theme-config';

/**
 * Portal Theme Loader Component
 * 
 * This component dynamically loads the appropriate CSS file based on the current portal
 * and ensures consistent theme application across all portals.
 */
export function PortalThemeLoader() {
  const pathname = usePathname();

  useEffect(() => {
    const portal = getPortalFromPath(pathname);
    
    // Remove existing portal CSS links
    const existingLinks = document.querySelectorAll('link[data-portal-css]');
    existingLinks.forEach(link => link.remove());
    
    // Add the appropriate portal CSS
    const cssFile = getPortalCSSFile(portal);
    if (cssFile) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssFile;
      link.setAttribute('data-portal-css', portal);
      document.head.appendChild(link);
    }
    
    // Set portal class on document element
    document.documentElement.classList.remove('portal-admin', 'portal-photographer', 'portal-client');
    document.documentElement.classList.add(`portal-${portal}`);
    
  }, [pathname]);

  return null; // This component doesn't render anything
}

/**
 * Get the CSS file path for a portal
 */
function getPortalCSSFile(portal: PortalType): string | null {
  const cssFiles = {
    admin: '/styles/admin.css',
    photographer: '/styles/photographer.css',
    client: '/styles/client.css',
  };
  
  return cssFiles[portal] || null;
}

/**
 * Portal Theme Provider Wrapper
 * 
 * This component combines the theme loader with portal-specific styling
 */
interface PortalThemeProviderProps {
  children: React.ReactNode;
  portal?: PortalType;
}

export function PortalThemeProvider({ children, portal }: PortalThemeProviderProps) {
  const pathname = usePathname();
  const currentPortal = portal || getPortalFromPath(pathname);
  
  useEffect(() => {
    // Apply portal-specific body classes
    document.body.classList.remove('admin-layout', 'photographer-layout', 'client-layout');
    document.body.classList.add(`${currentPortal}-layout`);
    
    // Set data attribute for CSS targeting
    document.body.setAttribute('data-portal', currentPortal);
    
    return () => {
      // Cleanup on unmount
      document.body.classList.remove('admin-layout', 'photographer-layout', 'client-layout');
      document.body.removeAttribute('data-portal');
    };
  }, [currentPortal]);
  
  return (
    <>
      <PortalThemeLoader />
      <div className={`${currentPortal}-layout`} data-portal={currentPortal}>
        {children}
      </div>
    </>
  );
}

/**
 * Hook to get current portal information
 */
export function useCurrentPortal(): PortalType {
  const pathname = usePathname();
  return getPortalFromPath(pathname);
}

/**
 * Portal-specific theme classes utility
 */
export function getPortalThemeClasses(portal: PortalType) {
  const baseClasses = {
    layout: `${portal}-layout`,
    card: `${portal}-card`,
    button: {
      primary: `${portal}-btn-primary`,
      secondary: `${portal}-btn-secondary`,
    },
    status: {
      active: `${portal}-status-active`,
      warning: `${portal}-status-warning`,
      error: `${portal}-status-error`,
      info: `${portal}-status-info`,
    },
    nav: {
      item: `${portal}-nav-item`,
    },
    form: {
      input: `${portal}-form-input`,
    },
    animations: {
      fadeIn: `${portal}-fade-in`,
      slideIn: `${portal}-slide-in`,
      loading: `${portal}-loading`,
    },
  };
  
  return baseClasses;
}

/**
 * Theme consistency checker (development only)
 */
export function checkThemeConsistency() {
  if (process.env.NODE_ENV !== 'development') return;
  
  const portals: PortalType[] = ['admin', 'photographer', 'client'];
  const issues: string[] = [];
  
  portals.forEach(portal => {
    const cssVars = [
      `--${portal}-primary`,
      `--${portal}-background`,
      `--${portal}-text`,
    ];
    
    cssVars.forEach(cssVar => {
      const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar);
      if (!value.trim()) {
        issues.push(`Missing CSS variable: ${cssVar}`);
      }
    });
  });
  
  if (issues.length > 0) {
    console.warn('Theme consistency issues found:', issues);
  } else {
    console.log('Theme consistency check passed');
  }
}