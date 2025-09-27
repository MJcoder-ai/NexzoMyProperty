import type { FastifyInstance } from '@nexzo/core';
import { badRequest, forbidden, notFound, requireAuth, z } from '@nexzo/core';
import { prisma, Prisma, InvoiceStatus } from '@nexzo/db';

const lineItemSchema = z.object({
  description: z.string().min(1),
  category: z.string().min(1),
  amount: z.number().positive(),
  quantity: z.number().positive().optional(),
  taxRate: z.number().min(0).optional(),
  solarBand: z.string().optional(),
});

const usageSchema = z.object({
  solarKwh: z.number().nonnegative(),
  gridKwh: z.number().nonnegative(),
});

const allocationSummarySchema = z.object({
  totalKwh: z.number(),
  solarKwh: z.number(),
  gridKwh: z.number(),
  solarPercent: z.number(),
  gridPercent: z.number(),
});

const complianceSchema = z.object({
  region: z.string().nullable(),
  note: z.string(),
  source: z.string(),
  rulePackId: z.string().nullable().optional(),
});

type AllocationSummary = z.infer<typeof allocationSummarySchema>;
type ComplianceInfo = z.infer<typeof complianceSchema>;

const fallbackComplianceMessages: Record<string, string> = {
  'US-CA':
    'California disclosure: Includes CPUC-approved tariffs, net-metering adjustments, and solar generation credits. Review Title 20 �1605 reports for detail.',
  'US-NY':
    'New York disclosure: Delivery and supply charges reflect NYPSC regulations. Community solar credits applied per NYSERDA guidance.',
  UK: 'UK disclosure: Statement complies with Ofgem supply licence condition 21B. Displayed amounts include VAT and EED transparency metrics.',
  EU: 'EU disclosure: Energy usage breakdown provided to meet EU Energy Efficiency Directive Article 9 obligations.',
  DEFAULT:
    'Invoice includes regulated delivery charges, energy supply, and applicable taxes. Contact support for region-specific compliance details.',
};

const normalizeRegion = (region?: string | null) => region?.toUpperCase() ?? undefined;

const round = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const buildAllocationSummary = (usage: z.infer<typeof usageSchema>): AllocationSummary => {
  const totalKwh = usage.solarKwh + usage.gridKwh;
  if (totalKwh === 0) {
    return {
      totalKwh: 0,
      solarKwh: 0,
      gridKwh: 0,
      solarPercent: 0,
      gridPercent: 0,
    };
  }

  const solarPercent = round((usage.solarKwh / totalKwh) * 100, 2);
  const gridPercent = round(100 - solarPercent, 2);

  return {
    totalKwh: round(totalKwh, 3),
    solarKwh: round(usage.solarKwh, 3),
    gridKwh: round(usage.gridKwh, 3),
    solarPercent,
    gridPercent,
  };
};

const resolveComplianceDisclosure = async (
  tenantId: string,
  propertyId: string | undefined,
  tenantRegion?: string | null,
): Promise<ComplianceInfo> => {
  const complianceState = await prisma.complianceRuleState.findFirst({
    where: {
      tenantId,
      status: 'active',
      ...(propertyId ? { propertyId } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      region: true,
      rulePackId: true,
      metadata: true,
    },
  });

  const region = normalizeRegion(complianceState?.region ?? tenantRegion);
  const fallbackNote =
    fallbackComplianceMessages[region ?? ''] ?? fallbackComplianceMessages.DEFAULT;

  if (complianceState) {
    let ruleNote: string | undefined;
    const metadata = complianceState.metadata;
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
      const disclosure = (metadata as Prisma.JsonObject).disclosure;
      if (typeof disclosure === 'string') {
        ruleNote = disclosure;
      }
    }

    return {
      region: region ?? null,
      note: ruleNote ?? fallbackNote,
      source: ruleNote ? 'rule-pack' : 'fallback',
      rulePackId: complianceState.rulePackId ?? null,
    };
  }

  return {
    region: region ?? null,
    note: fallbackNote,
    source: 'fallback',
    rulePackId: null,
  };
};

export async function registerBillingRoutes(app: FastifyInstance) {
  await app.register(requireAuth, { requireTenant: true });

  app.post(
    '/v1/invoices',
    {
      schema: {
        body: z.object({
          tenantId: z.string().uuid(),
          tenantUserId: z.string().uuid(),
          propertyId: z.string().uuid().optional(),
          billingPeriod: z.string().min(6),
          currency: z.string().length(3).default('USD'),
          usage: usageSchema,
          lineItems: z.array(lineItemSchema).min(1),
        }),
        response: {
          201: z.object({
            id: z.string().uuid(),
            status: z.string(),
            totalAmount: z.number(),
            currency: z.string(),
            issuedAt: z.string().nullable(),
            allocationSummary: allocationSummarySchema,
            compliance: complianceSchema,
            lineItems: z.array(
              z.object({
                id: z.string().uuid(),
                description: z.string(),
                category: z.string(),
                amount: z.number(),
              }),
            ),
          }),
          400: z.object({ error: z.string() }),
          403: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const body = request.body as {
        tenantId: string;
        tenantUserId: string;
        propertyId?: string;
        billingPeriod: string;
        currency?: string;
        usage: z.infer<typeof usageSchema>;
        lineItems: Array<{
          description: string;
          category: string;
          amount: number;
          quantity?: number;
          taxRate?: number;
          solarBand?: string;
        }>;
      };

      if (request.auth?.tenantId !== body.tenantId) {
        throw forbidden('Cannot draft invoices for another tenant');
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: body.tenantId },
        select: { id: true, region: true },
      });
      if (!tenant) {
        throw notFound('Tenant not found');
      }

      const currency = body.currency?.toUpperCase() ?? 'USD';

      const amountTotal = body.lineItems.reduce((sum, item) => sum + item.amount, 0);
      if (!Number.isFinite(amountTotal)) {
        throw badRequest('Invalid invoice total');
      }

      const tenantUser = await prisma.user.findFirst({
        where: { id: body.tenantUserId, tenantId: body.tenantId },
        select: { id: true },
      });
      if (!tenantUser) {
        throw notFound('Tenant user not found');
      }

      if (body.propertyId) {
        const property = await prisma.property.findFirst({
          where: { id: body.propertyId, tenantId: body.tenantId },
          select: { id: true },
        });
        if (!property) {
          throw notFound('Property not found for tenant');
        }
      }

      const allocationSummary = buildAllocationSummary(body.usage);
      const compliance = await resolveComplianceDisclosure(
        body.tenantId,
        body.propertyId,
        tenant.region,
      );

      const invoice = await prisma.invoice.create({
        data: {
          tenantId: body.tenantId,
          tenantUserId: body.tenantUserId,
          propertyId: body.propertyId,
          billingPeriod: body.billingPeriod,
          currency,
          status: InvoiceStatus.DRAFT,
          totalAmount: new Prisma.Decimal(amountTotal),
          metadata: {
            allocation: allocationSummary,
            compliance,
          } as Prisma.JsonObject,
          lines: {
            create: body.lineItems.map((item) => {
              const quantity = item.quantity ?? 1;
              const quantityDecimal = new Prisma.Decimal(quantity);
              const totalAmount = new Prisma.Decimal(item.amount);
              const unitAmount = totalAmount.div(quantityDecimal);

              return {
                description: item.description,
                category: item.category,
                quantity: quantityDecimal,
                unitAmount,
                totalAmount,
                taxRate: item.taxRate !== undefined ? new Prisma.Decimal(item.taxRate) : undefined,
                solarBand: item.solarBand,
              };
            }),
          },
        },
        include: {
          lines: true,
        },
      });

      return reply.code(201).send({
        id: invoice.id,
        status: invoice.status,
        totalAmount: Number(invoice.totalAmount),
        currency: invoice.currency,
        issuedAt: invoice.issuedAt ? invoice.issuedAt.toISOString() : null,
        allocationSummary,
        compliance,
        lineItems: invoice.lines.map((line) => ({
          id: line.id,
          description: line.description,
          category: line.category,
          amount: Number(line.totalAmount),
        })),
      });
    },
  );
}
