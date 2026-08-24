import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().url().default("postgresql://postgres:postgres@localhost:5432/farmasyncdb?schema=public"),
});

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  return environmentSchema.parse(config);
}
