import { createServiceApp, env } from '@nexzo/core';
import { registerBillingRoutes } from './routes';

export const SERVICE_NAME = 'billing';
export const SERVICE_VERSION = '0.1.0';

export const buildServer = async () => {
  const app = await createServiceApp({
    serviceName: SERVICE_NAME,
    version: SERVICE_VERSION,
  });
  await registerBillingRoutes(app);
  return app;
};

export const start = async () => {
  const app = await buildServer();
  const port = env.PORT ?? 3002;
  await app.listen({ port, host: '0.0.0.0' });
  return app;
};

if (require.main === module) {
  start().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start billing service', error);
    process.exit(1);
  });
}
