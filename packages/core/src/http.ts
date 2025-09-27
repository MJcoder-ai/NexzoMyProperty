import fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import fastifyCors from '@fastify/cors';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { HttpError } from './errors';

export interface CreateServiceAppOptions {
  serviceName: string;
  version?: string;
  serverOptions?: FastifyServerOptions;
}

const defaultErrorMapper = (error: unknown): HttpError => {
  if (error instanceof HttpError) {
    return error;
  }

  if (typeof error === 'object' && error && 'statusCode' in error && 'message' in error) {
    const { statusCode, message } = error as { statusCode?: number; message?: string };
    return new HttpError(statusCode ?? 500, message ?? 'Internal Server Error');
  }

  return new HttpError(500, 'Internal Server Error');
};

export const createServiceApp = async (
  options: CreateServiceAppOptions,
): Promise<FastifyInstance> => {
  const app = fastify({
    logger: process.env.NODE_ENV !== 'test',
    ...options.serverOptions,
  }).withTypeProvider<ZodTypeProvider>();

  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
  });

  app.get('/healthz', async () => ({
    service: options.serviceName,
    status: 'ok' as const,
    version: options.version,
    timestamp: new Date().toISOString(),
  }));

  app.get('/', async () => ({
    service: options.serviceName,
    status: 'ok' as const,
    version: options.version,
  }));

  app.setErrorHandler((error, request, reply) => {
    const mapped = defaultErrorMapper(error);
    if (mapped.status >= 500) {
      app.log.error({ err: error, requestId: request.id }, 'request failed');
    }

    reply.status(mapped.status).send({
      error: mapped.message,
      statusCode: mapped.status,
      service: options.serviceName,
    });
  });

  return app;
};
