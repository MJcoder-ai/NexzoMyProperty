import { createIdentifier } from '@nexzo/types';
import { ApiClient } from './index';

describe('ApiClient', () => {
  const fetchSpy = jest.spyOn(global, 'fetch');

  afterEach(() => {
    fetchSpy.mockReset();
  });

  it('builds requests with tenant header', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'tenant_1', name: 'Test Tenant' })
    } as Response);

    const client = new ApiClient({
      baseUrl: 'https://example.com',
      tenantId: createIdentifier('tenant_1')
    });

    await client.fetchTenant();

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.com/v1/tenants/tenant_1',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Tenant-Id': 'tenant_1' })
      })
    );
  });
});
