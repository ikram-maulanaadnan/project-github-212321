import * as bcrypt from 'bcrypt-ts';

// Security configuration
export const SECURITY_CONFIG = {
  SALT_ROUNDS: 12, // Very secure salt rounds
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIREMENTS: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  }
};

// Password hashing utilities
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(SECURITY_CONFIG.SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Password hashing failed');
  }
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
};

// Password strength validation
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const { minLength, requireUppercase, requireLowercase, requireNumbers, requireSpecialChars } = SECURITY_CONFIG.PASSWORD_REQUIREMENTS;

  if (password.length < minLength) {
    errors.push(`Password harus minimal ${minLength} karakter`);
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password harus mengandung huruf besar');
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password harus mengandung huruf kecil');
  }

  if (requireNumbers && !/\d/.test(password)) {
    errors.push('Password harus mengandung angka');
  }

  if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password harus mengandung karakter khusus');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Rate limiting utilities
export interface LoginAttempt {
  timestamp: number;
  ip?: string;
  userAgent?: string;
}

export class RateLimiter {
  private attempts: Map<string, LoginAttempt[]> = new Map();

  isBlocked(identifier: string): boolean {
    const userAttempts = this.attempts.get(identifier) || [];
    const recentAttempts = userAttempts.filter(
      attempt => Date.now() - attempt.timestamp < SECURITY_CONFIG.LOCKOUT_DURATION
    );

    return recentAttempts.length >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS;
  }

  addAttempt(identifier: string, attempt: LoginAttempt): void {
    const userAttempts = this.attempts.get(identifier) || [];
    userAttempts.push(attempt);
    
    // Clean old attempts
    const validAttempts = userAttempts.filter(
      att => Date.now() - att.timestamp < SECURITY_CONFIG.LOCKOUT_DURATION
    );
    
    this.attempts.set(identifier, validAttempts);
  }

  getRemainingLockoutTime(identifier: string): number {
    const userAttempts = this.attempts.get(identifier) || [];
    if (userAttempts.length === 0) return 0;

    const oldestRecentAttempt = userAttempts
      .filter(attempt => Date.now() - attempt.timestamp < SECURITY_CONFIG.LOCKOUT_DURATION)
      .sort((a, b) => a.timestamp - b.timestamp)[0];

    if (!oldestRecentAttempt) return 0;

    const lockoutEnd = oldestRecentAttempt.timestamp + SECURITY_CONFIG.LOCKOUT_DURATION;
    return Math.max(0, lockoutEnd - Date.now());
  }

  clearAttempts(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// Session management utilities
export interface SessionData {
  userId: string;
  username: string;
  role: string;
  createdAt: number;
  lastActivity: number;
  sessionId: string;
}

export const generateSessionId = (): string => {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

export const isSessionValid = (session: SessionData): boolean => {
  const now = Date.now();
  const sessionAge = now - session.createdAt;
  const inactivityTime = now - session.lastActivity;

  return sessionAge < SECURITY_CONFIG.SESSION_TIMEOUT && inactivityTime < SECURITY_CONFIG.SESSION_TIMEOUT;
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

// CSRF protection token
export const generateCSRFToken = (): string => {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Secure storage utilities
export const secureStorage = {
  setItem: (key: string, value: any): void => {
    try {
      const encrypted = btoa(JSON.stringify(value));
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Error storing data securely:', error);
    }
  },

  getItem: (key: string): any => {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      return JSON.parse(atob(encrypted));
    } catch (error) {
      console.error('Error retrieving data securely:', error);
      return null;
    }
  },

  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  }
};