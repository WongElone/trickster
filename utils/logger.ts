/**
 * Basic logging utility for Trickster application
 * Provides structured logging with different levels
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  timestamp: string
  level: string
  message: string
  data?: any
}

class Logger {
  private logLevel: LogLevel

  constructor() {
    const envLogLevel = process.env['LOG_LEVEL']?.toLowerCase() || 'info'
    this.logLevel = this.parseLogLevel(envLogLevel)
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level) {
      case 'error': return LogLevel.ERROR
      case 'warn': return LogLevel.WARN
      case 'info': return LogLevel.INFO
      case 'debug': return LogLevel.DEBUG
      default: return LogLevel.INFO
    }
  }

  private createLogEntry(level: string, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(data && { data })
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel
  }

  error(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = this.createLogEntry('ERROR', message, data)
      console.error(JSON.stringify(entry))
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const entry = this.createLogEntry('WARN', message, data)
      console.warn(JSON.stringify(entry))
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.createLogEntry('INFO', message, data)
      console.info(JSON.stringify(entry))
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.createLogEntry('DEBUG', message, data)
      console.debug(JSON.stringify(entry))
    }
  }
}

// Export singleton logger instance
export const logger = new Logger()
