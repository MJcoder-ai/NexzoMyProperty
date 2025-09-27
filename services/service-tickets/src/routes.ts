import type { FastifyInstance } from '@nexzo/core';
import { badRequest, forbidden, notFound, requireAuth, z } from '@nexzo/core';
import { prisma, Prisma, TicketPriority, TicketStatus } from '@nexzo/db';

const priorityFromInput = (priority?: string) => {
  if (!priority) {
    return TicketPriority.MEDIUM;
  }
  const key = priority.toUpperCase() as keyof typeof TicketPriority;
  return TicketPriority[key] ?? TicketPriority.MEDIUM;
};

const allowedStatusTransitions: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.NEW]: [TicketStatus.TRIAGED, TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
  [TicketStatus.TRIAGED]: [TicketStatus.QUOTED, TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
  [TicketStatus.QUOTED]: [TicketStatus.SCHEDULED, TicketStatus.CLOSED],
  [TicketStatus.SCHEDULED]: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.COMPLETED, TicketStatus.CLOSED],
  [TicketStatus.COMPLETED]: [TicketStatus.VERIFIED, TicketStatus.CLOSED],
  [TicketStatus.VERIFIED]: [TicketStatus.CLOSED],
  [TicketStatus.CLOSED]: [],
};

const ensureTransitionAllowed = (current: TicketStatus, next: TicketStatus) => {
  if (!allowedStatusTransitions[current]?.includes(next)) {
    throw badRequest('Cannot transition ticket from ' + current + ' to ' + next);
  }
};

const statusUpdateSchema = z.object({
  status: z.nativeEnum(TicketStatus),
  note: z.string().optional(),
});

const activitySchema = z.object({
  action: z.string().min(1),
  note: z.string().optional(),
});

const assignmentSchema = z.object({
  providerName: z.string().min(1),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  scheduledFor: z.string().datetime().optional(),
});

export async function registerTicketRoutes(app: FastifyInstance) {
  await app.register(requireAuth, { requireTenant: true });

  app.post(
    '/v1/tickets',
    {
      schema: {
        body: z.object({
          tenantId: z.string().uuid(),
          propertyId: z.string().uuid(),
          unitId: z.string().uuid().nullable().optional(),
          summary: z.string().min(4),
          description: z.string().optional(),
          priority: z.enum(['low', 'medium', 'high']).optional(),
          category: z.string().optional(),
        }),
        response: {
          201: z.object({
            id: z.string().uuid(),
            status: z.string(),
            tenantId: z.string().uuid(),
            propertyId: z.string().uuid(),
            summary: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        tenantId: string;
        propertyId: string;
        unitId?: string | null;
        summary: string;
        description?: string;
        priority?: 'low' | 'medium' | 'high';
        category?: string;
      };

      if (request.auth?.tenantId !== body.tenantId) {
        throw forbidden('Cannot raise tickets for another tenant');
      }

      const property = await prisma.property.findFirst({
        where: { id: body.propertyId, tenantId: body.tenantId },
        select: { id: true },
      });
      if (!property) {
        throw notFound('Property not found for tenant');
      }

      if (body.unitId) {
        const unit = await prisma.unit.findFirst({
          where: { id: body.unitId, propertyId: body.propertyId },
          select: { id: true },
        });
        if (!unit) {
          throw notFound('Unit not found for property');
        }
      }

      const ticket = await prisma.serviceTicket.create({
        data: {
          tenantId: body.tenantId,
          propertyId: body.propertyId,
          unitId: body.unitId ?? null,
          openedById: request.auth?.subject,
          summary: body.summary,
          description: body.description,
          category: body.category,
          priority: priorityFromInput(body.priority),
          activities: {
            create: {
              action: 'created',
              actorId: request.auth?.subject,
              payload: {
                summary: body.summary,
                category: body.category,
              } as Prisma.JsonObject,
            },
          },
        },
        select: {
          id: true,
          status: true,
          tenantId: true,
          propertyId: true,
          summary: true,
        },
      });

      return reply.code(201).send(ticket);
    },
  );

  app.post(
    '/v1/tickets/:ticketId/status',
    {
      schema: {
        params: z.object({
          ticketId: z.string().uuid(),
        }),
        body: statusUpdateSchema,
        response: {
          200: z.object({
            id: z.string().uuid(),
            status: z.string(),
            updatedAt: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { ticketId } = request.params as { ticketId: string };
      const body = request.body as z.infer<typeof statusUpdateSchema>;

      const ticket = await prisma.serviceTicket.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          tenantId: true,
          status: true,
        },
      });

      if (!ticket) {
        throw notFound('Ticket not found');
      }

      if (request.auth?.tenantId !== ticket.tenantId) {
        throw forbidden('Cannot mutate tickets for another tenant');
      }

      const nextStatus = body.status;
      ensureTransitionAllowed(ticket.status, nextStatus);

      const updated = await prisma.serviceTicket.update({
        where: { id: ticketId },
        data: {
          status: nextStatus,
          activities: {
            create: {
              action: 'status:' + nextStatus.toLowerCase(),
              actorId: request.auth?.subject ?? null,
              payload: body.note ? ({ note: body.note } as Prisma.JsonObject) : undefined,
            },
          },
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      });

      return reply.code(200).send({
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      });
    },
  );

  app.post(
    '/v1/tickets/:ticketId/activity',
    {
      schema: {
        params: z.object({ ticketId: z.string().uuid() }),
        body: activitySchema,
        response: {
          201: z.object({
            id: z.string().uuid(),
            action: z.string(),
            createdAt: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { ticketId } = request.params as { ticketId: string };
      const body = request.body as z.infer<typeof activitySchema>;

      const ticket = await prisma.serviceTicket.findUnique({
        where: { id: ticketId },
        select: { id: true, tenantId: true },
      });

      if (!ticket) {
        throw notFound('Ticket not found');
      }

      if (request.auth?.tenantId !== ticket.tenantId) {
        throw forbidden('Cannot mutate tickets for another tenant');
      }

      const activity = await prisma.ticketActivity.create({
        data: {
          ticketId,
          actorId: request.auth?.subject ?? null,
          action: body.action,
          payload: body.note ? ({ note: body.note } as Prisma.JsonObject) : undefined,
        },
        select: {
          id: true,
          action: true,
          createdAt: true,
        },
      });

      return reply.code(201).send({
        id: activity.id,
        action: activity.action,
        createdAt: activity.createdAt.toISOString(),
      });
    },
  );

  app.post(
    '/v1/tickets/:ticketId/assignment',
    {
      schema: {
        params: z.object({ ticketId: z.string().uuid() }),
        body: assignmentSchema,
        response: {
          200: z.object({
            id: z.string().uuid(),
            providerName: z.string(),
            scheduledFor: z.string().nullable(),
            updatedAt: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { ticketId } = request.params as { ticketId: string };
      const body = request.body as z.infer<typeof assignmentSchema>;

      const ticket = await prisma.serviceTicket.findUnique({
        where: { id: ticketId },
        select: { id: true, tenantId: true },
      });

      if (!ticket) {
        throw notFound('Ticket not found');
      }

      if (request.auth?.tenantId !== ticket.tenantId) {
        throw forbidden('Cannot mutate tickets for another tenant');
      }

      const scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : undefined;
      if (scheduledFor && Number.isNaN(scheduledFor.getTime())) {
        throw badRequest('Invalid scheduledFor datetime');
      }

      const contactDetails = [body.contactEmail, body.contactPhone].filter(Boolean).join(' / ');

      const updateData: Prisma.TicketScheduleUpdateInput = {
        providerName: body.providerName,
        status: 'scheduled',
        notes: contactDetails ? 'Contact: ' + contactDetails : undefined,
      };
      if (scheduledFor) {
        updateData.scheduledFor = scheduledFor;
      }

      const createData: Prisma.TicketScheduleUncheckedCreateInput = {
        ticketId,
        providerName: body.providerName,
        status: 'scheduled',
        notes: contactDetails ? 'Contact: ' + contactDetails : undefined,
        scheduledFor: scheduledFor ? scheduledFor : new Date(),
      };

      const existingSchedule = await prisma.ticketSchedule.findFirst({
        where: { ticketId },
        select: { id: true },
      });

      const schedule = existingSchedule
        ? await prisma.ticketSchedule.update({
            where: { id: existingSchedule.id },
            data: updateData,
            select: {
              id: true,
              providerName: true,
              scheduledFor: true,
              updatedAt: true,
            },
          })
        : await prisma.ticketSchedule.create({
            data: createData,
            select: {
              id: true,
              providerName: true,
              scheduledFor: true,
              updatedAt: true,
            },
          });

      await prisma.ticketActivity.create({
        data: {
          ticketId,
          actorId: request.auth?.subject ?? null,
          action: 'assignment:provider',
          payload: body as Prisma.JsonObject,
        },
      });

      return reply.code(200).send({
        id: schedule.id,
        providerName: schedule.providerName,
        scheduledFor: schedule.scheduledFor ? schedule.scheduledFor.toISOString() : null,
        updatedAt: schedule.updatedAt.toISOString(),
      });
    },
  );
}
