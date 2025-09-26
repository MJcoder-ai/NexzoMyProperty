import { getHealth } from './index';

describe('service-tickets health', () => {
  it('reports ok status', () => {
    const health = getHealth();
    expect(health.status).toBe('ok');
    expect(health.service).toBe('service-tickets');
  });
});
