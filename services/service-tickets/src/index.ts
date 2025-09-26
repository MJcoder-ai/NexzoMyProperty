import { createIdentifier } from '@nexzo/types';

export interface HealthStatus {
  service: string;
  status: 'ok';
  timestamp: number;
}

export const getHealth = (): HealthStatus => ({
  service: 'service-tickets',
  status: 'ok',
  timestamp: Date.now()
});

export const exampleTenantId = () => createIdentifier('tenant-demo');

if (require.main === module) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(getHealth()));
}
