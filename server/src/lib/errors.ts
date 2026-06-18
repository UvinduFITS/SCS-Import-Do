/** Domain error with an HTTP status code attached. */
export class HttpError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export const notFound = (msg = 'Resource not found') => new HttpError(404, msg);
export const badRequest = (msg = 'Bad request', details?: unknown) => new HttpError(400, msg, details);
export const upstreamError = (msg = 'Upstream service error', details?: unknown) =>
  new HttpError(502, msg, details);
