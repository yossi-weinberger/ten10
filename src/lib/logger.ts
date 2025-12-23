/**
 * Centralized Logger Utility
 *
 * Provides a consistent logging interface that automatically
 * disables in production builds while maintaining full functionality
 * in development.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.log('Message');
 *   logger.error('Error message');
 *   logger.warn('Warning message');
 */

// Vite environment flag (safe for frontend builds)
const isDevelopment = import.meta.env.DEV;

/**
 * Logger class that wraps console methods
 * All methods are no-ops in production
 */
class Logger {
  /**
   * Standard log message
   */
  log(...args: any[]): void {
    if (isDevelopment) {
      console.log(...args);
    }
  }

  /**
   * Error message (always logs, even in production for critical errors)
   */
  error(...args: any[]): void {
    console.error(...args);
  }

  /**
   * Warning message
   */
  warn(...args: any[]): void {
    if (isDevelopment) {
      console.warn(...args);
    }
  }

  /**
   * Info message
   */
  info(...args: any[]): void {
    if (isDevelopment) {
      console.info(...args);
    }
  }

  /**
   * Debug message
   */
  debug(...args: any[]): void {
    if (isDevelopment) {
      console.debug(...args);
    }
  }

  /**
   * Group messages together
   */
  group(label: string): void {
    if (isDevelopment) {
      console.group(label);
    }
  }

  /**
   * End a group
   */
  groupEnd(): void {
    if (isDevelopment) {
      console.groupEnd();
    }
  }

  /**
   * Log a table
   */
  table(data: any): void {
    if (isDevelopment) {
      console.table(data);
    }
  }

  /**
   * Time measurement start
   */
  time(label: string): void {
    if (isDevelopment) {
      console.time(label);
    }
  }

  /**
   * Time measurement end
   */
  timeEnd(label: string): void {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  }
}

// Export a singleton instance
export const logger = new Logger();

// For backwards compatibility and easy migration
export default logger;
