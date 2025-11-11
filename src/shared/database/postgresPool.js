import { Pool } from "pg";

let pool;

export function getPostgresPool(options = {}) {
  if (!pool) {
    const {
      connectionString = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/design_patterns",
      ssl = process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
    } = options;

    // Singleton simples para reaproveitar conexoes em CLI e demos
    pool = new Pool({
      connectionString,
      ssl,
      ...options,
    });
  }

  return pool;
}

export async function closePostgresPool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
