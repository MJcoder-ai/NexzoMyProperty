// @ts-check

/** @type {import('prisma').Prisma.Internals.ConfigMetaFormat} */
const config = {
  schema: 'packages/db/prisma/schema.prisma',
  generators: [
    {
      name: 'prisma-client-js',
      provider: 'prisma-client-js',
      output: '../../packages/db/generated/client'
    }
  ],
  datasources: [
    {
      name: 'db',
      provider: 'postgresql',
      url: {
        fromEnvVar: 'DATABASE_URL'
      }
    }
  ]
};

module.exports = config;
