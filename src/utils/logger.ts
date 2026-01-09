import { LogLevel } from '../types/index.js';

/**
 * Structured logger that writes to stderr
 * Required for MCP servers since stdout is reserved for the protocol
 */

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Get current log level from environment or default to 'info'
 */
function getCurrentLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel as LogLevel;
  }
  return 'info';
}

/**
 * Format a log message with timestamp and level
 */
function formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Log a message to stderr if level is enabled
 */
function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const currentLevel = getCurrentLogLevel();
  if (LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]) {
    console.error(formatMessage(level, message, context));
  }
}

/**
 * Logger instance with level-specific methods
 */
export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
};

export default logger;
