import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });

export default pool;

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}
