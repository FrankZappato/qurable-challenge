import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { config } from '../config/environment';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Log error
  logger.error('Error occurred:', {
    error: err.message,
    stack: config.server.isDevelopment ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Handle known errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        ...(config.server.isDevelopment && { stack: err.stack }),
      },
    });
    return;
  }

  // Handle validation errors (Zod)
  if (err.name === 'ZodError') {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: (err as any).errors,
      },
    });
    return;
  }

  // Handle database errors
  if (err.name === 'QueryFailedError') {
    res.status(500).json({
      error: {
        code: 'DATABASE_ERROR',
        message: config.server.isDevelopment ? err.message : 'Database operation failed',
      },
    });
    return;
  }

  // Default 500 error
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: config.server.isDevelopment ? err.message : 'An unexpected error occurred',
      ...(config.server.isDevelopment && { stack: err.stack }),
    },
  });
}
