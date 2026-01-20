import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/postmaker';

const client = postgres(DATABASE_URL);

export const db = drizzle(client, { schema });

export { schema };
