import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

type DatabaseType = "prisma" | "supabase";

function resolveDatabaseType(): DatabaseType {
  const rawDbType = (process.env.DB_TYPE ?? "prisma").trim().toLowerCase();

  if (rawDbType === "prisma" || rawDbType === "supabase") {
    return rawDbType;
  }

  const hint =
    rawDbType === "superbase" ? " Did you mean \"supabase\"?" : "";
  throw new Error(
    `Invalid DB_TYPE value: "${process.env.DB_TYPE}". Expected "prisma" or "supabase".${hint}`,
  );
}

// Support both Prisma-hosted PostgreSQL and Supabase
const dbType = resolveDatabaseType();
const connectionString =
  dbType === "supabase" ? process.env.SUPABASEDB_STRING : process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    `${dbType === "supabase" ? "SUPABASEDB_STRING" : "DATABASE_URL"} must be set. Did you forget to provision a database?`,
  );
}

export const pool = new Pool({ 
  connectionString,
  ...(dbType === "supabase" && {
    // Supabase SSL configuration
    ssl: { rejectUnauthorized: false },
  }),
});
export const db = drizzle(pool, { schema });

export * from "./schema";
