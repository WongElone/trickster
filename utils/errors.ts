/**
 * Error handling utilities for Trickster application
 * Provides custom error classes and error handling functions
 */

import { logger } from './logger'

/**
 * Base application error class
 */
export class TricksterError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message)
    this.name = 'TricksterError'
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, TricksterError.prototype)
  }
}

/**
 * Validation error class
 */
export class ValidationError extends TricksterError {
  constructor(message: string, field?: string) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      true
    )
    this.name = 'ValidationError'
    
    if (field) {
      logger.warn('Validation error', { field, message })
    }
  }
}

/**
 * Database error class
 */
export class DatabaseError extends TricksterError {
  constructor(message: string, originalError?: Error) {
    super(
      message,
      'DATABASE_ERROR',
      500,
      true
    )
    this.name = 'DatabaseError'
    
    logger.error('Database error', { message, originalError: originalError?.message })
  }
}

/**
 * AI service error class
 */
export class AIServiceError extends TricksterError {
  constructor(message: string, service: string, originalError?: Error) {
    super(
      message,
      'AI_SERVICE_ERROR',
      503,
      true
    )
    this.name = 'AIServiceError'
    
    logger.error('AI service error', { service, message, originalError: originalError?.message })
  }
}

/**
 * File system error class
 */
export class FileSystemError extends TricksterError {
  constructor(message: string, path?: string, originalError?: Error) {
    super(
      message,
      'FILE_SYSTEM_ERROR',
      500,
      true
    )
    this.name = 'FileSystemError'
    
    logger.error('File system error', { path, message, originalError: originalError?.message })
  }
}

/**
 * Global error handler for unhandled errors
 */
export const handleError = (error: Error): void => {
  if (error instanceof TricksterError && error.isOperational) {
    logger.error('Operational error', { 
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode
    })
  } else {
    logger.error('Unexpected error', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
  }
}

/**
 * Async error wrapper for handling promises
 */
export const asyncHandler = <T extends any[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return (...args: T): Promise<R> => {
    return Promise.resolve(fn(...args)).catch((error) => {
      handleError(error)
      throw error
    })
  }
}
