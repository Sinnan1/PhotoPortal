/**
 * Validation utilities for admin operations
 * Provides comprehensive input validation for security and data integrity
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PasswordValidationResult extends ValidationResult {
  strength: 'weak' | 'medium' | 'strong';
  score: number;
}

/**
 * Email validation with comprehensive checks
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  // Basic email format validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) {
    errors.push('Invalid email format');
  }

  // Length validation
  if (email.length > 254) {
    errors.push('Email address is too long');
  }

  // Local part length validation
  const [localPart] = email.split('@');
  if (localPart && localPart.length > 64) {
    errors.push('Email local part is too long');
  }

  // Check for dangerous characters
  const dangerousChars = /[<>\"'%;()&+]/.test(email);
  if (dangerousChars) {
    errors.push('Email contains invalid characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Password validation with strength assessment
 */
export function validatePassword(password: string, options: {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  maxLength?: number;
} = {}): PasswordValidationResult {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = true,
    maxLength = 128
  } = options;

  const errors: string[] = [];
  let score = 0;

  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors, strength: 'weak', score: 0 };
  }

  // Length validation
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  } else {
    score += 1;
  }

  if (password.length > maxLength) {
    errors.push(`Password must be no more than ${maxLength} characters long`);
  }

  // Character type validation
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (/[A-Z]/.test(password)) {
    score += 1;
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (/[a-z]/.test(password)) {
    score += 1;
  }

  if (requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (/\d/.test(password)) {
    score += 1;
  }

  if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  }

  // Common password checks
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty', 'letmein',
    'welcome', 'monkey', '1234567890', 'abc123', '111111', 'dragon',
    'master', 'hello', 'freedom', 'whatever', 'qazwsx', 'trustno1'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common and easily guessable');
    score = Math.max(0, score - 2);
  }

  // Sequential character check
  const sequentialPattern = /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|123|234|345|456|567|678|789|890)/i;
  if (sequentialPattern.test(password)) {
    errors.push('Password contains sequential characters');
    score = Math.max(0, score - 1);
  }

  // Repeated character check
  const repeatedPattern = /(.)\1{2,}/;
  if (repeatedPattern.test(password)) {
    errors.push('Password contains too many repeated characters');
    score = Math.max(0, score - 1);
  }

  // Length bonus
  if (password.length >= 12) {
    score += 1;
  }
  if (password.length >= 16) {
    score += 1;
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 6) {
    strength = 'strong';
  } else if (score >= 4) {
    strength = 'medium';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score
  };
}

/**
 * Name validation for user names
 */
export function validateName(name: string): ValidationResult {
  const errors: string[] = [];

  if (!name) {
    errors.push('Name is required');
    return { isValid: false, errors };
  }

  // Length validation
  if (name.length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (name.length > 100) {
    errors.push('Name must be no more than 100 characters long');
  }

  // Character validation - allow letters, spaces, hyphens, apostrophes
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(name)) {
    errors.push('Name can only contain letters, spaces, hyphens, and apostrophes');
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(name)) {
      errors.push('Name contains potentially dangerous content');
      break;
    }
  }

  // Trim and check for empty after trimming
  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    errors.push('Name cannot be empty or only whitespace');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Role validation
 */
export function validateRole(role: string): ValidationResult {
  const errors: string[] = [];
  const validRoles = ['ADMIN', 'PHOTOGRAPHER', 'CLIENT'];

  if (!role) {
    errors.push('Role is required');
    return { isValid: false, errors };
  }

  if (!validRoles.includes(role)) {
    errors.push(`Role must be one of: ${validRoles.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate and sanitize search input
 */
export function validateSearchInput(search: string): ValidationResult {
  const errors: string[] = [];

  if (!search) {
    return { isValid: true, errors: [] };
  }

  // Length validation
  if (search.length > 255) {
    errors.push('Search term is too long');
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /union\s+select/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /insert\s+into/i,
    /update\s+set/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(search)) {
      errors.push('Search term contains potentially dangerous content');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(page?: string | number, limit?: string | number): ValidationResult {
  const errors: string[] = [];

  // Validate page
  if (page !== undefined) {
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    if (isNaN(pageNum) || pageNum < 1 || pageNum > 10000) {
      errors.push('Page must be a positive integer between 1 and 10000');
    }
  }

  // Validate limit
  if (limit !== undefined) {
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('Limit must be a positive integer between 1 and 100');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Comprehensive user creation validation
 */
export function validateUserCreation(data: {
  email: string;
  name: string;
  password: string;
  role?: string;
}): ValidationResult {
  const errors: string[] = [];

  // Validate email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    errors.push(...emailValidation.errors);
  }

  // Validate name
  const nameValidation = validateName(data.name);
  if (!nameValidation.isValid) {
    errors.push(...nameValidation.errors);
  }

  // Validate password with strict requirements for admin-created users
  const passwordValidation = validatePassword(data.password, {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  });
  if (!passwordValidation.isValid) {
    errors.push(...passwordValidation.errors);
  }

  // Validate role if provided
  if (data.role) {
    const roleValidation = validateRole(data.role);
    if (!roleValidation.isValid) {
      errors.push(...roleValidation.errors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

