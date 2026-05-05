/**
 * supabaseseeder.js
 * -----------------
 * Direct PostgreSQL seeder for Supabase — cross-platform (Windows / Linux / Mac)
 * Uses: pg (node-postgres) — no Supabase client needed
 *
 * Usage:
 *   npm install pg
 *   node supabaseseeder.js
 */

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const CONNECTION_STRING =
  process.env.SUPABASEDB_STRING ||
  "postgres://postgres:CIDGCvJYri1z6Q4p@aws-0-us-west-2.pooler.supabase.com:5432/postgres";

// ─── MAIN ──────────────────────────────────────────────────────────────────────

async function seed() {
  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }, // required for Supabase hosted connections
  });

  console.log("\n🌱  Supabase Seeder");
  console.log("──────────────────────────────────────\n");

  try {
    await client.connect();
    console.log("✅  Connected to database\n");

    // Read seed files in order
    const seedDir = path.join(__dirname, "scripts", "src");
    const seedFiles = [
      "seed-kenya-01-users.sql",
      "seed-kenya-02-sectors.sql",
      "seed-kenya-03-cycle-allocations.sql",
      "seed-kenya-04-products-procurement.sql",
    ];

    for (const file of seedFiles) {
      const filePath = path.join(seedDir, file);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${file}\n`);
        continue;
      }

      const sql = fs.readFileSync(filePath, "utf8");
      console.log(`📄  Executing: ${file}`);
      console.log(`   (${sql.length} characters)`);

      try {
        await client.query(sql);
        console.log(`✅  ${file} completed\n`);
      } catch (err) {
        console.error(`❌  ${file} failed: ${err.message}\n`);
        throw err;
      }
    }

    // Verify seed data
    console.log("🔍  Verifying seed data...\n");
    
    const verifyQueries = [
      "SELECT COUNT(*) as count FROM sectors;",
      "SELECT COUNT(*) as count FROM users;",
      "SELECT COUNT(*) as count FROM allocations;",
      "SELECT COUNT(*) as count FROM products;",
      "SELECT COALESCE(SUM(allocated_amount), 0) as total FROM allocations;",
    ];

    const labels = ["Sectors", "Users", "Allocations", "Products", "Budget (KES)"];
    const expected = [2373, 3021, 2372, 20, 1000000000000];

    for (let i = 0; i < verifyQueries.length; i++) {
      const result = await client.query(verifyQueries[i]);
      const actual = result.rows[0].count || result.rows[0].total;
      const exp = expected[i];
      const match = actual === exp ? "✅" : "⚠️";
      
      console.log(`${match} ${labels[i]}: ${actual.toLocaleString()} (expected: ${exp.toLocaleString()})`);
    }

    console.log("\n──────────────────────────────────────");
    console.log("✅  Seeding complete.\n");
  } catch (err) {
    console.error("❌  Fatal error:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
