export const SERVICE_NAME = 'api-gateway';

export interface HealthStatus {
  service: string;
  status: 'ok';
  timestamp: number;
  uptimeSeconds: number;
}

const startedAt = Date.now();

export const getHealth = (): HealthStatus => ({
  service: SERVICE_NAME,
  status: 'ok',
  timestamp: Date.now(),
  uptimeSeconds: Math.round((Date.now() - startedAt) / 1000)
});
