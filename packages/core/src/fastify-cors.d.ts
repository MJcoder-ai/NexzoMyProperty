declare module '@fastify/cors' {
  import type { FastifyPluginCallback } from 'fastify';

  interface FastifyCorsOptions {
    origin?: boolean | string | RegExp | Array<string | RegExp>;
    credentials?: boolean;
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    methods?: string[];
  }

  const fastifyCors: FastifyPluginCallback<FastifyCorsOptions>;
  export default fastifyCors;
}
