import { getHealth, SERVICE_NAME, SERVICE_VERSION } from './index';

describe('onboarding health', () => {
  it('reports ok status', () => {
    const health = getHealth();
    expect(health.status).toBe('ok');
    expect(health.service).toBe(SERVICE_NAME);
    expect(health.version).toBe(SERVICE_VERSION);
    expect(health.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
