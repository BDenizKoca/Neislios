import { logger } from './logger';
import toast from 'react-hot-toast';

export interface AppError {
  message: string;
  code?: string;
  context?: Record<string, unknown>;
}

export function createAppError(message: string, code?: string, context?: Record<string, unknown>): AppError {
  return { message, code, context };
}

export function handleError(error: unknown, fallbackMessage = 'An unexpected error occurred'): AppError {
  if (error instanceof Error) {
    return createAppError(error.message, 'JS_ERROR', { stack: error.stack });
  }
  
  if (typeof error === 'string') {
    return createAppError(error);
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return createAppError(String(error.message));
  }
  
  return createAppError(fallbackMessage, 'UNKNOWN_ERROR', { originalError: error });
}

export function logAndShowError(error: unknown, context?: string, fallbackMessage?: string): AppError {
  const appError = handleError(error, fallbackMessage);
  
  logger.error(context ? `${context}: ${appError.message}` : appError.message, error);
  toast.error(appError.message);
  
  return appError;
}

export function showSuccess(message: string): void {
  toast.success(message);
  logger.info('Success:', message);
}

// Utility for async operations with error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  fallbackMessage?: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    logAndShowError(error, context, fallbackMessage);
    return null;
  }
}
