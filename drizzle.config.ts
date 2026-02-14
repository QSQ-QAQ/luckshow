import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
  schema: './src/storage/database/shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/luckshow',
  },
} satisfies Config;
