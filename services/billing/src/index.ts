import { SERVICE_NAME, SERVICE_VERSION } from './server';

export { buildServer, start, SERVICE_NAME, SERVICE_VERSION } from './server';

const startedAt = Date.now();

export const getHealth = () => ({
  service: SERVICE_NAME,
  status: 'ok' as const,
  version: SERVICE_VERSION,
  timestamp: Date.now(),
  uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
});
