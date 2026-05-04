import { SQL } from 'bun';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = new SQL(connectionString);

export default sql;
