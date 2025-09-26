import { getHealth, SERVICE_NAME } from './index';

describe('billing health', () => {
  it('reports ok status', () => {
    const health = getHealth();
    expect(health.status).toBe('ok');
    expect(health.service).toBe(SERVICE_NAME);
    expect(health.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
