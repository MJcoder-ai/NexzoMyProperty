import type { FastifyPluginCallback } from 'fastify';
import { badRequest, unauthorized } from './errors';

export interface AuthContext {
  subject: string;
  tenantId?: string;
  roles: string[];
  raw: string;
}

export interface RequireAuthOptions {
  optional?: boolean;
  requireTenant?: boolean;
}

const decodeAuthToken = (token: string): AuthContext => {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as Partial<AuthContext> & { sub?: string };
    if (!parsed.subject && !parsed.sub) {
      throw new Error('missing subject');
    }
    return {
      subject: parsed.subject ?? parsed.sub!,
      tenantId: parsed.tenantId,
      roles: parsed.roles ?? [],
      raw: token,
    };
  } catch {
    if (token.includes(':')) {
      const [tenant, subject] = token.split(':');
      return {
        subject,
        tenantId: tenant,
        roles: [],
        raw: token,
      };
    }

    return {
      subject: token,
      roles: [],
      raw: token,
    };
  }
};

export const requireAuth: FastifyPluginCallback<RequireAuthOptions> = (app, opts, done) => {
  app.addHook('preHandler', async (request) => {
    const header = request.headers.authorization;
    if (!header) {
      if (opts?.optional) {
        return;
      }
      throw unauthorized();
    }

    const [scheme, token] = header.split(' ');
    if (!token || scheme?.toLowerCase() !== 'bearer') {
      throw unauthorized('Invalid authorization header');
    }

    const context = decodeAuthToken(token);
    const tenantFromHeader = request.headers['x-tenant-id'];
    if (!context.tenantId && typeof tenantFromHeader === 'string') {
      context.tenantId = tenantFromHeader;
    }

    if (opts?.requireTenant && !context.tenantId) {
      throw badRequest('Tenant context missing');
    }

    request.auth = context;
  });

  done();
};
