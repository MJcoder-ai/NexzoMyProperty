import { createServiceApp, env } from '@nexzo/core';
import { registerOnboardingRoutes } from './routes';

export const SERVICE_NAME = 'onboarding';
export const SERVICE_VERSION = '0.1.0';

export const buildServer = async () => {
  const app = await createServiceApp({
    serviceName: SERVICE_NAME,
    version: SERVICE_VERSION,
  });
  await registerOnboardingRoutes(app);
  return app;
};

export const start = async () => {
  const app = await buildServer();
  const port = env.PORT ?? 3001;
  await app.listen({ port, host: '0.0.0.0' });
  return app;
};

if (require.main === module) {
  start().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start onboarding service', error);
    process.exit(1);
  });
}
