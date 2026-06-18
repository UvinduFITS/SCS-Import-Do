import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/errors.js';
import { logger } from '../logger.js';

/** Express error-handling middleware. Normalises all errors into a JSON envelope. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    logger.warn('Validation error', { path: req.path, issues: err.issues });
    return res.status(400).json({
      error: 'ValidationError',
      message: 'One or more fields are invalid.',
      issues: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }

  if (err instanceof HttpError) {
    if (err.status >= 500) logger.error(err.message, { path: req.path, details: err.details });
    else logger.warn(err.message, { path: req.path });
    return res.status(err.status).json({
      error: err.name,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  const e = err as Error;
  logger.error('Unhandled error', { path: req.path, message: e?.message, stack: e?.stack });
  return res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected error occurred.',
  });
}

/** Wrap async route handlers so thrown/rejected errors reach the error handler. */
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(
  fn: T,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
