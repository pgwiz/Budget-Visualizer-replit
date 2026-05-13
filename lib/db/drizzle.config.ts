import { defineConfig } from "drizzle-kit";
import path from "path";

// Resolve the connection string using the same DB_TYPE logic as src/index.ts
// so that `pnpm --filter @workspace/db run push` honours DB_TYPE.
function getConnectionString(): string {
  const provider = (process.env.DB_TYPE ?? "postgres").trim().toLowerCase();
  const isSupabase = provider === "supabase";

  const cs = isSupabase
    ? (process.env.SUPABASE_DATABASE_URL ?? process.env.SUPABASEDB_STRING ?? process.env.DATABASE_URL)
    : process.env.DATABASE_URL;

  if (!cs) {
    const varName = isSupabase
      ? "SUPABASE_DATABASE_URL (or DATABASE_URL)"
      : "DATABASE_URL";
    throw new Error(
      `${varName} must be set before running drizzle-kit push.\n` +
      "Provision a database or export the env var and retry.",
    );
  }
  return cs;
}

const provider = (process.env.DB_TYPE ?? "postgres").trim().toLowerCase();
const sslProviders = ["supabase", "neon", "railway"];

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: getConnectionString(),
    ssl: sslProviders.includes(provider),
  },
});
