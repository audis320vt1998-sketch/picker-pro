export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  [key: string]: unknown
}

export interface Logger {
  debug(message: string, context?: LogContext): void
  info(message: string, context?: LogContext): void
  warn(message: string, context?: LogContext): void
  error(message: string, context?: LogContext): void
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

function shouldLog(level: LogLevel, minimumLevel: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minimumLevel]
}

function formatMessage(name: string, message: string, context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) {
    return `[${name}] ${message}`
  }

  return `[${name}] ${message} ${JSON.stringify(context)}`
}

export function createLogger(name: string, minimumLevel: LogLevel = 'info'): Logger {
  return {
    debug(message, context) {
      if (!shouldLog('debug', minimumLevel)) return
      console.debug(formatMessage(name, message, context))
    },
    info(message, context) {
      if (!shouldLog('info', minimumLevel)) return
      console.info(formatMessage(name, message, context))
    },
    warn(message, context) {
      if (!shouldLog('warn', minimumLevel)) return
      console.warn(formatMessage(name, message, context))
    },
    error(message, context) {
      if (!shouldLog('error', minimumLevel)) return
      console.error(formatMessage(name, message, context))
    },
  }
}
