import { getHealth } from './index';

describe('billing health', () => {
  it('reports ok status', () => {
    const health = getHealth();
    expect(health.status).toBe('ok');
    expect(health.service).toBe('billing');
  });
});
