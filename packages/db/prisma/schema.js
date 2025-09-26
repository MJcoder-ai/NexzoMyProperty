// @ts-check
const { readFileSync } = require('fs');
const { join } = require('path');

const schema = readFileSync(join(__dirname, 'schema.prisma'), 'utf8');

module.exports = schema;
