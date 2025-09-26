import { getHealth } from './index';

describe('api-gateway health', () => {
  it('reports ok status', () => {
    const health = getHealth();
    expect(health.status).toBe('ok');
    expect(health.service).toBe('api-gateway');
  });
});
