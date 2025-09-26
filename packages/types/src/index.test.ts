import { createIdentifier } from './index';

describe('types helpers', () => {
  it('creates branded identifiers', () => {
    const id = createIdentifier('tenant_123');
    expect(id).toBe('tenant_123');
  });
});
