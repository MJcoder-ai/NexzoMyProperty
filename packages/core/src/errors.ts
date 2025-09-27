export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, details);
export const unauthorized = (message = 'Unauthorized') => new HttpError(401, message);
export const forbidden = (message = 'Forbidden') => new HttpError(403, message);
export const notFound = (message = 'Not Found') => new HttpError(404, message);
export const conflict = (message = 'Conflict') => new HttpError(409, message);
export const internalError = (message = 'Internal Server Error') => new HttpError(500, message);
