import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .pipe(z.number().int().positive().optional()),
  DATABASE_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
