import type { FastifyInstance } from '@nexzo/core';
import { forbidden, notFound, requireAuth, z } from '@nexzo/core';
import { prisma } from '@nexzo/db';

export async function registerApiGatewayRoutes(app: FastifyInstance) {
  await app.register(requireAuth, { requireTenant: true });

  app.get(
    '/v1/tenants/:tenantId',
    {
      schema: {
        params: z.object({ tenantId: z.string().uuid() }),
        response: {
          200: z.object({
            id: z.string().uuid(),
            name: z.string(),
            region: z.string().nullable(),
          }),
          403: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request) => {
      const { tenantId } = request.params as { tenantId: string };
      if (request.auth?.tenantId && request.auth.tenantId !== tenantId) {
        throw forbidden('Cross-tenant access is not permitted');
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, region: true },
      });

      if (!tenant) {
        throw notFound('Tenant not found');
      }

      return tenant;
    },
  );
}
