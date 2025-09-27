import { createServiceApp, env } from '@nexzo/core';
import { registerTicketRoutes } from './routes';

export const SERVICE_NAME = 'service-tickets';
export const SERVICE_VERSION = '0.1.0';

export const buildServer = async () => {
  const app = await createServiceApp({
    serviceName: SERVICE_NAME,
    version: SERVICE_VERSION,
  });
  await registerTicketRoutes(app);
  return app;
};

export const start = async () => {
  const app = await buildServer();
  const port = env.PORT ?? 3003;
  await app.listen({ port, host: '0.0.0.0' });
  return app;
};

if (require.main === module) {
  start().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start service-tickets service', error);
    process.exit(1);
  });
}
