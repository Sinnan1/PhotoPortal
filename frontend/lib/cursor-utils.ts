/**
 * Cursor Behavior Utilities
 * 
 * This utility provides helper functions and constants for consistent cursor behavior
 * across all portals (Admin, Photographer, and Client).
 */

import { cn } from "@/lib/utils";

/**
 * Cursor behavior class names
 */
export const cursorClasses = {
  pointer: "cursor-pointer",
  notAllowed: "cursor-not-allowed",
  text: "cursor-text",
  grab: "cursor-grab",
  grabbing: "cursor-grabbing",
  help: "cursor-help",
  wait: "cursor-wait",
  resize: "cursor-resize",
  default: "cursor-default",
} as const;

/**
 * Interactive element class names for consistent cursor behavior
 */
export const interactiveClasses = {
  clickable: "cursor-pointer clickable",
  navItem: "cursor-pointer nav-item",
  cardClickable: "cursor-pointer card-clickable hover:shadow-md transition-shadow duration-200",
  buttonBase: "cursor-pointer disabled:cursor-not-allowed",
  formElement: "cursor-text",
  checkbox: "cursor-pointer",
  radio: "cursor-pointer",
  select: "cursor-pointer",
  draggable: "cursor-grab active:cursor-grabbing",
  disabled: "cursor-not-allowed",
  loading: "cursor-wait",
  tooltip: "cursor-help",
} as const;

/**
 * Apply cursor behavior to an element based on its interactive state
 */
export function getCursorClass(
  type: keyof typeof interactiveClasses,
  disabled?: boolean,
  loading?: boolean
): string {
  if (loading) return cursorClasses.wait;
  if (disabled) return cursorClasses.notAllowed;
  return interactiveClasses[type];
}

/**
 * Combine cursor classes with existing className
 */
export function withCursor(
  className: string | undefined,
  cursorType: keyof typeof interactiveClasses,
  options?: {
    disabled?: boolean;
    loading?: boolean;
  }
): string {
  return cn(
    className,
    getCursorClass(cursorType, options?.disabled, options?.loading)
  );
}

/**
 * Props interface for components that support cursor behavior
 */
export interface CursorProps {
  /**
   * Whether the element is clickable
   */
  clickable?: boolean;
  
  /**
   * Whether the element is disabled
   */
  disabled?: boolean;
  
  /**
   * Whether the element is in a loading state
   */
  loading?: boolean;
  
  /**
   * Custom cursor type
   */
  cursor?: keyof typeof cursorClasses;
}

/**
 * Get cursor styles for a component based on its props
 */
export function getCursorStyles(props: CursorProps): string {
  const { clickable, disabled, loading, cursor } = props;
  
  if (cursor) return cursorClasses[cursor];
  if (loading) return cursorClasses.wait;
  if (disabled) return cursorClasses.notAllowed;
  if (clickable) return cursorClasses.pointer;
  
  return "";
}

/**
 * Common cursor behavior patterns for different component types
 */
export const cursorPatterns = {
  /**
   * Standard button cursor behavior
   */
  button: (disabled?: boolean, loading?: boolean) => 
    getCursorClass("buttonBase", disabled, loading),
    
  /**
   * Card component cursor behavior
   */
  card: (clickable?: boolean) => 
    clickable ? interactiveClasses.cardClickable : "",
    
  /**
   * Navigation item cursor behavior
   */
  navItem: () => interactiveClasses.navItem,
  
  /**
   * Form input cursor behavior
   */
  input: (type: "text" | "checkbox" | "radio" | "select" = "text") => {
    switch (type) {
      case "checkbox":
      case "radio":
        return interactiveClasses.checkbox;
      case "select":
        return interactiveClasses.select;
      default:
        return interactiveClasses.formElement;
    }
  },
  
  /**
   * Table row cursor behavior
   */
  tableRow: (clickable?: boolean) => 
    clickable ? interactiveClasses.clickable : "",
    
  /**
   * Draggable element cursor behavior
   */
  draggable: () => interactiveClasses.draggable,
} as const;