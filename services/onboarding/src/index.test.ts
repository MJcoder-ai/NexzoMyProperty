import { getHealth } from './index';

describe('onboarding health', () => {
  it('reports ok status', () => {
    const health = getHealth();
    expect(health.status).toBe('ok');
    expect(health.service).toBe('onboarding');
  });
});
