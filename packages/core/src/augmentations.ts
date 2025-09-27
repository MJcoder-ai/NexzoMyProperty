import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    auth?: {
      subject: string;
      tenantId?: string;
      roles: string[];
      raw: string;
    };
  }
}

export {};
