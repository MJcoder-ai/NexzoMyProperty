import type { FastifyInstance } from '@nexzo/core';
import { badRequest, conflict, forbidden, notFound, requireAuth, z } from '@nexzo/core';
import { prisma, Prisma, UserRole } from '@nexzo/db';
import { randomUUID } from 'node:crypto';

const addressSchema = z
  .object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().optional(),
    postalCode: z.string().min(1),
    country: z.string().min(2),
  })
  .passthrough();

const parseRole = (role?: string) => {
  if (!role) {
    return UserRole.LANDLORD_ADMIN;
  }
  const key = role.toUpperCase() as keyof typeof UserRole;
  if (!UserRole[key]) {
    throw badRequest(`Unsupported user role: ${role}`);
  }
  return UserRole[key];
};

const ensureTenantScope = (authTenantId: string | undefined, tenantId: string) => {
  if (!authTenantId || authTenantId !== tenantId) {
    throw forbidden('Cross-tenant access is not permitted');
  }
};

export async function registerOnboardingRoutes(app: FastifyInstance) {
  app.post(
    '/v1/tenants',
    {
      schema: {
        body: z.object({
          name: z.string().min(2),
          region: z.string().optional(),
        }),
        response: {
          201: z.object({
            id: z.string().uuid(),
            name: z.string(),
            region: z.string().nullable(),
            status: z.string(),
            createdAt: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        name: string;
        region?: string;
        metadata?: Record<string, unknown>;
      };
      const tenant = await prisma.tenant.create({
        data: {
          name: body.name,
          region: body.region,
        },
      });

      return reply.code(201).send({
        id: tenant.id,
        name: tenant.name,
        region: tenant.region ?? null,
        status: tenant.status,
        createdAt: tenant.createdAt.toISOString(),
      });
    },
  );

  app.post(
    '/v1/invitations/:token/accept',
    {
      schema: {
        params: z.object({ token: z.string().min(1) }),
        body: z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
        }),
        response: {
          200: z.object({
            tenantId: z.string().uuid(),
            userId: z.string().uuid(),
            email: z.string().email(),
            role: z.string(),
            acceptedAt: z.string(),
          }),
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const body = request.body as { firstName?: string; lastName?: string };

      const invitation = await prisma.tenantInvitation.findUnique({
        where: { token },
      });

      if (!invitation) {
        throw notFound('Invitation not found');
      }
      if (invitation.status !== 'pending') {
        throw conflict('Invitation already used or revoked');
      }
      if (invitation.expiresAt < new Date()) {
        await prisma.tenantInvitation.update({
          where: { id: invitation.id },
          data: { status: 'expired' },
        });
        throw badRequest('Invitation has expired');
      }

      const acceptedAt = new Date();
      const email = invitation.email.toLowerCase();

      const user = await prisma.$transaction(async (tx) => {
        const upserted = await tx.user.upsert({
          where: { tenantId_email: { tenantId: invitation.tenantId, email } },
          update: {
            firstName: body.firstName,
            lastName: body.lastName,
            role: invitation.role,
            status: 'active',
          },
          create: {
            tenantId: invitation.tenantId,
            email,
            firstName: body.firstName,
            lastName: body.lastName,
            role: invitation.role,
          },
        });

        await tx.tenantInvitation.update({
          where: { id: invitation.id },
          data: {
            status: 'accepted',
            acceptedAt,
          },
        });

        return upserted;
      });

      return reply.code(200).send({
        tenantId: invitation.tenantId,
        userId: user.id,
        email: user.email,
        role: invitation.role,
        acceptedAt: acceptedAt.toISOString(),
      });
    },
  );

  await app.register(async (secured) => {
    await secured.register(requireAuth, { requireTenant: true });

    secured.post(
      '/v1/tenants/:tenantId/users',
      {
        schema: {
          params: z.object({ tenantId: z.string().uuid() }),
          body: z.object({
            email: z.string().email(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            role: z.string().optional(),
          }),
          response: {
            201: z.object({
              id: z.string().uuid(),
              tenantId: z.string().uuid(),
              email: z.string().email(),
              role: z.string(),
              createdAt: z.string(),
            }),
          },
        },
      },
      async (request, reply) => {
        const { tenantId } = request.params as { tenantId: string };
        ensureTenantScope(request.auth?.tenantId, tenantId);

        const body = request.body as {
          email: string;
          firstName?: string;
          lastName?: string;
          role?: string;
        };

        try {
          const user = await prisma.user.create({
            data: {
              tenantId,
              email: body.email.toLowerCase(),
              firstName: body.firstName,
              lastName: body.lastName,
              role: parseRole(body.role),
            },
          });

          return reply.code(201).send({
            id: user.id,
            tenantId: user.tenantId,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt.toISOString(),
          });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw conflict('A user with that email already exists for this tenant');
          }
          throw error;
        }
      },
    );

    secured.patch(
      '/v1/tenants/:tenantId/users/:userId/profile',
      {
        schema: {
          params: z.object({ tenantId: z.string().uuid(), userId: z.string().uuid() }),
          body: z.object({
            firstName: z.string().min(1).optional(),
            lastName: z.string().min(1).optional(),
            status: z.string().optional(),
          }),
          response: {
            200: z.object({
              id: z.string().uuid(),
              tenantId: z.string().uuid(),
              email: z.string().email(),
              firstName: z.string().nullable(),
              lastName: z.string().nullable(),
              status: z.string(),
              updatedAt: z.string(),
            }),
          },
        },
      },
      async (request, reply) => {
        const { tenantId, userId } = request.params as { tenantId: string; userId: string };
        ensureTenantScope(request.auth?.tenantId, tenantId);

        const body = request.body as {
          firstName?: string;
          lastName?: string;
          status?: string;
        };

        const user = await prisma.user.update({
          where: { id: userId },
          data: {
            firstName: body.firstName,
            lastName: body.lastName,
            status: body.status,
          },
          select: {
            id: true,
            tenantId: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            updatedAt: true,
          },
        });

        ensureTenantScope(request.auth?.tenantId, user.tenantId);

        return reply.code(200).send({
          id: user.id,
          tenantId: user.tenantId,
          email: user.email,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
          status: user.status,
          updatedAt: user.updatedAt.toISOString(),
        });
      },
    );

    secured.post(
      '/v1/properties',
      {
        schema: {
          body: z.object({
            tenantId: z.string().uuid(),
            name: z.string().min(2),
            address: addressSchema,
            timezone: z.string().optional(),
            solarCapacityKw: z.number().positive().optional(),
            metadata: z.record(z.any()).optional(),
          }),
          response: {
            201: z.object({
              id: z.string().uuid(),
              tenantId: z.string().uuid(),
              name: z.string(),
              createdAt: z.string(),
            }),
          },
        },
      },
      async (request, reply) => {
        const body = request.body as {
          tenantId: string;
          name: string;
          address: Record<string, unknown>;
          timezone?: string;
          solarCapacityKw?: number;
          metadata?: Record<string, unknown>;
        };

        ensureTenantScope(request.auth?.tenantId, body.tenantId);

        const property = await prisma.property.create({
          data: {
            tenantId: body.tenantId,
            name: body.name,
            address: body.address as Prisma.InputJsonValue,
            timezone: body.timezone,
            solarCapacityKw: body.solarCapacityKw
              ? new Prisma.Decimal(body.solarCapacityKw)
              : undefined,
            metadata: body.metadata as Prisma.InputJsonValue | undefined,
          },
        });

        return reply.code(201).send({
          id: property.id,
          tenantId: property.tenantId,
          name: property.name,
          createdAt: property.createdAt.toISOString(),
        });
      },
    );

    secured.post(
      '/v1/properties/:propertyId/units',
      {
        schema: {
          params: z.object({ propertyId: z.string().uuid() }),
          body: z.object({
            tenantId: z.string().uuid(),
            label: z.string().min(1),
            floor: z.string().optional(),
            squareFeet: z.number().int().positive().optional(),
          }),
          response: {
            201: z.object({
              id: z.string().uuid(),
              propertyId: z.string().uuid(),
              label: z.string(),
              createdAt: z.string(),
            }),
          },
        },
      },
      async (request, reply) => {
        const { propertyId } = request.params as { propertyId: string };
        const body = request.body as {
          tenantId: string;
          label: string;
          floor?: string;
          squareFeet?: number;
        };

        ensureTenantScope(request.auth?.tenantId, body.tenantId);

        const property = await prisma.property.findFirst({
          where: { id: propertyId, tenantId: body.tenantId },
          select: { id: true },
        });
        if (!property) {
          throw notFound('Property not found for tenant');
        }

        const unit = await prisma.unit.create({
          data: {
            propertyId,
            label: body.label,
            floor: body.floor,
            squareFeet: body.squareFeet,
          },
        });

        return reply.code(201).send({
          id: unit.id,
          propertyId: unit.propertyId,
          label: unit.label,
          createdAt: unit.createdAt.toISOString(),
        });
      },
    );

    secured.post(
      '/v1/units/:unitId/tenancies',
      {
        schema: {
          params: z.object({ unitId: z.string().uuid() }),
          body: z.object({
            tenantId: z.string().uuid(),
            userId: z.string().uuid(),
            startDate: z.string().datetime(),
            endDate: z.string().datetime().optional(),
          }),
          response: {
            201: z.object({
              id: z.string().uuid(),
              unitId: z.string().uuid(),
              userId: z.string().uuid(),
              startDate: z.string(),
              endDate: z.string().nullable(),
              status: z.string(),
            }),
          },
        },
      },
      async (request, reply) => {
        const { unitId } = request.params as { unitId: string };
        const body = request.body as {
          tenantId: string;
          userId: string;
          startDate: string;
          endDate?: string;
        };

        ensureTenantScope(request.auth?.tenantId, body.tenantId);

        const unit = await prisma.unit.findFirst({
          where: { id: unitId },
          include: { property: { select: { tenantId: true } } },
        });
        if (!unit || unit.property.tenantId !== body.tenantId) {
          throw notFound('Unit not found for tenant');
        }

        const tenantUser = await prisma.user.findFirst({
          where: { id: body.userId, tenantId: body.tenantId },
          select: { id: true },
        });
        if (!tenantUser) {
          throw notFound('User not found for tenant');
        }

        const startDate = new Date(body.startDate);
        if (Number.isNaN(startDate.getTime())) {
          throw badRequest('Invalid startDate');
        }
        let endDate: Date | null = null;
        if (body.endDate) {
          endDate = new Date(body.endDate);
          if (Number.isNaN(endDate.getTime())) {
            throw badRequest('Invalid endDate');
          }
          if (endDate < startDate) {
            throw badRequest('End date must be after start date');
          }
        }

        const tenancy = await prisma.tenancy.create({
          data: {
            unitId,
            userId: body.userId,
            startDate,
            endDate: endDate ?? undefined,
          },
          select: {
            id: true,
            unitId: true,
            userId: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        });

        return reply.code(201).send({
          id: tenancy.id,
          unitId: tenancy.unitId,
          userId: tenancy.userId,
          startDate: tenancy.startDate.toISOString(),
          endDate: tenancy.endDate ? tenancy.endDate.toISOString() : null,
          status: tenancy.status,
        });
      },
    );

    secured.post(
      '/v1/tenants/:tenantId/invitations',
      {
        schema: {
          params: z.object({ tenantId: z.string().uuid() }),
          body: z.object({
            email: z.string().email(),
            role: z.string().optional(),
            expiresInHours: z
              .number()
              .int()
              .positive()
              .max(24 * 14)
              .optional(),
          }),
          response: {
            201: z.object({
              invitationId: z.string().uuid(),
              tenantId: z.string().uuid(),
              email: z.string().email(),
              role: z.string(),
              token: z.string(),
              expiresAt: z.string(),
            }),
          },
        },
      },
      async (request, reply) => {
        const { tenantId } = request.params as { tenantId: string };
        ensureTenantScope(request.auth?.tenantId, tenantId);

        const body = request.body as {
          email: string;
          role?: string;
          expiresInHours?: number;
        };

        const role = parseRole(body.role ?? 'TENANT');
        const expiresInHours = body.expiresInHours ?? 72;
        const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
        const token = randomUUID();

        try {
          const invitation = await prisma.tenantInvitation.create({
            data: {
              tenantId,
              email: body.email.toLowerCase(),
              invitedById: request.auth?.subject ?? null,
              role,
              token,
              expiresAt,
            },
          });

          return reply.code(201).send({
            invitationId: invitation.id,
            tenantId: invitation.tenantId,
            email: invitation.email,
            role: invitation.role,
            token: invitation.token,
            expiresAt: invitation.expiresAt.toISOString(),
          });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw conflict('An invitation has already been sent to that email');
          }
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            throw notFound('Tenant not found');
          }
          throw error;
        }
      },
    );
  });
}
