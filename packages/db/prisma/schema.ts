// @ts-check

/** @type {import('prisma').Prisma.Schema} */
module.exports = {
  datasources: [
    {
      provider: 'postgresql',
      url: {
        fromEnvVar: 'DATABASE_URL'
      }
    }
  ],
  generators: [
    {
      provider: 'prisma-client-js',
      output: '../generated/client'
    }
  ]
};
